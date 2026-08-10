import type { Plugin, Connect } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import type { ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import {
  extractDriveFileId,
  fetchDriveFileViaApiKey,
  fetchDriveFileViaUc,
} from './drive-download.ts'

export type ModelStageEntry = {
  id: string
  label: string
  subtitle?: string
  missionHint?: string
  /** Empty site / scratch baseline — no GLB required */
  blank?: boolean
  driveFileId?: string
  driveUrl?: string
  localPath?: string
  ready?: boolean
  notes?: string
}

export type ModelIndex = {
  project?: string
  defaultStageId?: string
  stages: ModelStageEntry[]
}

type DriveModelPluginOptions = {
  root: string
  /** Fallback file id / URL if index has no match */
  fileIdOrUrl?: string
  apiKey?: string
  indexPath?: string
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function parseQuery(url: string): URLSearchParams {
  const i = url.indexOf('?')
  return new URLSearchParams(i >= 0 ? url.slice(i + 1) : '')
}

async function pipeWebStreamToResponse(
  body: ReadableStream<Uint8Array>,
  res: ServerResponse,
): Promise<void> {
  const nodeStream = Readable.fromWeb(body as import('stream/web').ReadableStream)
  await new Promise<void>((resolve, reject) => {
    nodeStream.on('error', reject)
    res.on('error', reject)
    res.on('finish', () => resolve())
    nodeStream.pipe(res)
  })
}

function isGlbMagic(buf: Buffer): boolean {
  return buf.length >= 4 && buf.toString('utf8', 0, 4) === 'glTF'
}

function readIndex(indexPath: string): ModelIndex {
  try {
    const raw = fs.readFileSync(indexPath, 'utf8')
    const parsed = JSON.parse(raw) as ModelIndex
    if (!Array.isArray(parsed.stages)) return { stages: [] }
    return parsed
  } catch {
    return { stages: [] }
  }
}

function resolveStageFileId(stage: ModelStageEntry, fallback?: string): string | null {
  return (
    extractDriveFileId(stage.driveFileId ?? '') ||
    extractDriveFileId(stage.driveUrl ?? '') ||
    extractDriveFileId(fallback ?? '')
  )
}

function enrichStages(index: ModelIndex, fallback?: string): ModelStageEntry[] {
  return index.stages.map((s) => {
    if (s.blank) {
      return { ...s, driveFileId: '', ready: true, blank: true }
    }
    const id =
      resolveStageFileId(s, s.id === index.defaultStageId ? fallback : undefined) ?? ''
    const ready = Boolean(id || s.localPath?.trim())
    return { ...s, driveFileId: id || s.driveFileId || '', ready }
  })
}

/**
 * Multi-stage Drive GLB proxy (ASI-style index).
 * GET /api/drive-model/index
 * GET /api/drive-model?stage=final | ?id=<driveFileId>
 * GET /api/drive-model/status
 */
export function driveModelPlugin(opts: DriveModelPluginOptions): Plugin {
  const cacheDir = path.join(opts.root, '.drive-cache')
  const indexPath = opts.indexPath ?? path.join(opts.root, 'public', 'models', 'model-index.json')

  function cachePathFor(id: string) {
    return path.join(cacheDir, `${id}.glb`)
  }

  async function fetchUpstream(fileId: string): Promise<Response> {
    const key = (opts.apiKey ?? '').trim()
    if (key) {
      const apiRes = await fetchDriveFileViaApiKey(fileId, key)
      if (apiRes?.ok && apiRes.body) {
        const ct = (apiRes.headers.get('content-type') ?? '').toLowerCase()
        if (!ct.includes('text/html') && !ct.includes('application/json')) return apiRes
      }
    }
    return fetchDriveFileViaUc(fileId)
  }

  async function streamGlb(fileId: string, res: ServerResponse) {
    const cacheFile = cachePathFor(fileId)

    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile)
      const head = Buffer.alloc(4)
      const fd = fs.openSync(cacheFile, 'r')
      fs.readSync(fd, head, 0, 4, 0)
      fs.closeSync(fd)
      if (isGlbMagic(head) && stat.size > 64) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'model/gltf-binary')
        res.setHeader('Content-Length', String(stat.size))
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.setHeader('X-Drive-Cache', 'HIT')
        res.setHeader('X-Drive-File-Id', fileId)
        fs.createReadStream(cacheFile).pipe(res)
        return
      }
      fs.unlinkSync(cacheFile)
    }

    const upstream = await fetchUpstream(fileId)
    if (!upstream.ok || !upstream.body) {
      let snippet = ''
      try {
        snippet = (await upstream.clone().text()).slice(0, 500)
      } catch {
        /* ignore */
      }
      sendJson(res, 502, {
        error: 'Google Drive fetch failed',
        upstreamStatus: upstream.status,
        fileId,
        snippet,
        hint: 'Share as Anyone with the link → Viewer. Use the FILE id, not a folder.',
      })
      return
    }

    const ct = (upstream.headers.get('content-type') ?? '').toLowerCase()
    if (ct.includes('text/html') || ct.includes('application/json')) {
      let snippet = ''
      try {
        snippet = (await upstream.text()).slice(0, 500)
      } catch {
        /* ignore */
      }
      sendJson(res, 502, {
        error: 'Drive returned HTML/JSON instead of a GLB',
        fileId,
        snippet,
        hint: 'Virus-scan page or permission issue — share publicly or set GOOGLE_DRIVE_API_KEY.',
      })
      return
    }

    fs.mkdirSync(cacheDir, { recursive: true })
    const tmp = `${cacheFile}.part`
    const write = fs.createWriteStream(tmp)
    const lenHeader = upstream.headers.get('content-length')
    res.statusCode = 200
    res.setHeader('Content-Type', 'model/gltf-binary')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('X-Drive-Cache', 'MISS')
    res.setHeader('X-Drive-File-Id', fileId)
    if (lenHeader) res.setHeader('Content-Length', lenHeader)

    const webBody = upstream.body as ReadableStream<Uint8Array>
    const [forClient, forDisk] = webBody.tee()

    const diskDone = (async () => {
      const nodeDisk = Readable.fromWeb(forDisk as import('stream/web').ReadableStream)
      await new Promise<void>((resolve, reject) => {
        nodeDisk.pipe(write)
        write.on('finish', () => resolve())
        write.on('error', reject)
        nodeDisk.on('error', reject)
      })
      try {
        const head = Buffer.alloc(4)
        const fd = fs.openSync(tmp, 'r')
        fs.readSync(fd, head, 0, 4, 0)
        fs.closeSync(fd)
        if (isGlbMagic(head)) fs.renameSync(tmp, cacheFile)
        else fs.unlinkSync(tmp)
      } catch {
        try {
          fs.unlinkSync(tmp)
        } catch {
          /* ignore */
        }
      }
    })().catch(() => {
      try {
        write.destroy()
        fs.unlinkSync(tmp)
      } catch {
        /* ignore */
      }
    })

    await pipeWebStreamToResponse(forClient, res)
    await diskDone
  }

  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url ?? ''
    if (!url.startsWith('/api/drive-model')) {
      next()
      return
    }

    const index = readIndex(indexPath)
    const stages = enrichStages(index, opts.fileIdOrUrl)
    const q = parseQuery(url)

    if (req.method === 'GET' && (url === '/api/drive-model/index' || url.startsWith('/api/drive-model/index?'))) {
      sendJson(res, 200, {
        ...index,
        stages,
        source: indexPath,
      })
      return
    }

    if (req.method === 'GET' && (url === '/api/drive-model/status' || url.startsWith('/api/drive-model/status?'))) {
      sendJson(res, 200, {
        indexPath,
        defaultStageId: index.defaultStageId ?? stages.find((s) => s.ready)?.id ?? null,
        stages: stages.map((s) => ({
          id: s.id,
          label: s.label,
          ready: s.ready,
          driveFileId: s.driveFileId || null,
          cached: s.driveFileId ? fs.existsSync(cachePathFor(s.driveFileId)) : false,
        })),
        apiKeyConfigured: Boolean((opts.apiKey ?? '').trim()),
        proxyPath: '/api/drive-model?stage=<id>',
      })
      return
    }

    if (req.method !== 'GET' || !(url === '/api/drive-model' || url.startsWith('/api/drive-model?'))) {
      next()
      return
    }

    const stageId = (q.get('stage') ?? '').trim()
    const directId = extractDriveFileId(q.get('id') ?? '')
    let fileId: string | null = directId

    if (!fileId && stageId) {
      const stage = stages.find((s) => s.id === stageId)
      if (!stage) {
        sendJson(res, 404, { error: 'Unknown stage', stageId, known: stages.map((s) => s.id) })
        return
      }
      if (stage.blank) {
        sendJson(res, 204, { blank: true, stageId })
        return
      }
      fileId = resolveStageFileId(stage, opts.fileIdOrUrl)
      if (!fileId && stage.localPath) {
        // Redirect client to static local asset
        res.statusCode = 302
        res.setHeader('Location', stage.localPath)
        res.end()
        return
      }
    }

    if (!fileId) {
      const fallbackStage =
        stages.find((s) => s.id === index.defaultStageId) ?? stages.find((s) => s.ready)
      fileId = fallbackStage ? resolveStageFileId(fallbackStage, opts.fileIdOrUrl) : extractDriveFileId(opts.fileIdOrUrl ?? '')
    }

    if (!fileId) {
      sendJson(res, 404, {
        error: 'No Drive file id for this stage',
        hint: 'Add driveFileId to public/models/model-index.json for the stage, share as Anyone with the link, restart vite.',
        stages: stages.map((s) => ({ id: s.id, ready: s.ready })),
      })
      return
    }

    try {
      await streamGlb(fileId, res)
    } catch (err) {
      if (!res.headersSent) {
        sendJson(res, 502, {
          error: 'Drive model proxy error',
          message: err instanceof Error ? err.message : String(err),
          fileId,
        })
      } else if (!res.writableEnded) {
        res.destroy()
      }
    }
  }

  return {
    name: 'drive-model-proxy',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export function readDriveModelEnv(env: Record<string, string>): {
  fileIdOrUrl?: string
  apiKey?: string
} {
  return {
    fileIdOrUrl:
      env.VITE_SITE_GLB_DRIVE_FILE_ID?.trim() ||
      env.VITE_SITE_GLB_DRIVE_URL?.trim() ||
      env.SITE_GLB_DRIVE_FILE_ID?.trim() ||
      undefined,
    apiKey: env.GOOGLE_DRIVE_API_KEY?.trim() || env.VITE_GOOGLE_DRIVE_API_KEY?.trim() || undefined,
  }
}

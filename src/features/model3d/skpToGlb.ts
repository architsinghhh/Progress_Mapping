/**
 * SketchUp (.skp) → GLB conversion for the 3D viewer.
 * Separate from Drive/GLB cache — does not alter getOrFetchModelBuffer.
 */

import { buildScene, toGLB } from 'openskp'

const sessionGlb = new Map<string, ArrayBuffer>()
const inFlight = new Map<string, Promise<ArrayBuffer>>()

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(u8.byteLength)
  new Uint8Array(copy).set(u8)
  return copy
}

export type SkpConvertProgress = {
  phase: 'download' | 'parse' | 'glb'
  /** 0–100 within phase when known */
  pct: number | null
  detail?: string
}

/**
 * Fetch a .skp URL, convert in-browser via openskp, return GLB bytes for GLTFLoader.
 */
export async function getOrConvertSkpToGlb(
  skpUrl: string,
  onProgress?: (p: SkpConvertProgress) => void,
): Promise<ArrayBuffer> {
  const hit = sessionGlb.get(skpUrl)
  if (hit) {
    onProgress?.({ phase: 'glb', pct: 100, detail: 'Cached' })
    return hit
  }

  const pending = inFlight.get(skpUrl)
  if (pending) return pending

  const work = (async () => {
    onProgress?.({ phase: 'download', pct: 5, detail: 'Downloading SketchUp…' })
    const res = await fetch(skpUrl, { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`SKP fetch failed (HTTP ${res.status})`)
    const skpBuf = await res.arrayBuffer()
    onProgress?.({ phase: 'download', pct: 100, detail: 'Download complete' })

    onProgress?.({ phase: 'parse', pct: 0, detail: 'Parsing SketchUp…' })
    const scene = buildScene(skpBuf, {
      onProgress: (info) => {
        const pct =
          info.total > 0 ? Math.min(99, Math.round((100 * info.current) / info.total)) : null
        onProgress?.({
          phase: 'parse',
          pct,
          detail: `${info.stage} ${info.current}/${info.total}`,
        })
      },
    })

    onProgress?.({ phase: 'glb', pct: 50, detail: 'Building GLB…' })
    const glb = toGLB(scene)
    const ab = toArrayBuffer(glb)
    sessionGlb.set(skpUrl, ab)
    onProgress?.({ phase: 'glb', pct: 100, detail: 'Ready' })
    return ab
  })()

  inFlight.set(skpUrl, work)
  try {
    return await work
  } finally {
    inFlight.delete(skpUrl)
  }
}

export type SkpAsset = {
  id: string
  label: string
  /** Public URL under /public */
  url: string
  notes?: string
}

/** Optional SketchUp assets per project (parallel to GLB stages). */
export function skpAssetsForProject(projectId: string | undefined): SkpAsset[] {
  if (projectId === 'prj_sage_repose') {
    return [
      {
        id: 'sage_clubhouse',
        label: 'Clubhouse',
        url: '/Sage/clubhouse%203D.skp',
        notes: 'From public/Sage — converted in browser for viewing',
      },
    ]
  }
  return []
}

/**
 * Google Drive download helpers (ASI-style).
 * Browser never talks to Drive — the Vite proxy uses these server-side.
 */

const BROWSER_LIKE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

export function extractDriveFileId(urlOrId: string): string | null {
  const raw = (urlOrId ?? '').trim()
  if (!raw) return null
  // Bare file id
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw) && !raw.includes('/') && !raw.includes('?')) return raw
  try {
    const u = new URL(raw, 'https://drive.google.com')
    const fromQuery = u.searchParams.get('id') ?? u.searchParams.get('file_id')
    if (fromQuery?.trim()) return fromQuery.trim()
    const fileD = u.pathname.match(/\/file\/d\/([^/]+)/i)
    if (fileD?.[1]?.trim()) return fileD[1].trim()
    return null
  } catch {
    return null
  }
}

export function driveUcDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
}

function isProbablyHtml(buf: Uint8Array): boolean {
  const n = Math.min(256, buf.length)
  const s = new TextDecoder('utf8', { fatal: false }).decode(buf.subarray(0, n)).trimStart()
  return s.startsWith('<!') || s.toLowerCase().startsWith('<html')
}

function driveFetchInit(): RequestInit {
  return {
    redirect: 'follow',
    headers: {
      'User-Agent': BROWSER_LIKE_UA,
      Accept: '*/*',
      Referer: 'https://drive.google.com/',
    },
  }
}

function driveDownloadCandidates(fileId: string): string[] {
  return [
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
    `https://drive.google.com/uc?id=${encodeURIComponent(fileId)}&export=download`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`,
    `https://docs.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  ]
}

function extractConfirmCode(html: string): string | null {
  const input = html.match(/name\s*=\s*["']confirm["'][^>]*\bvalue\s*=\s*["']([^"']+)["']/i)
  if (input?.[1]?.trim()) return input[1].trim()
  const urlc = html.match(/[?&]confirm=([^&"'<>\s]+)/i)
  if (urlc?.[1] && urlc[1] !== 't') return urlc[1].replace(/&amp;/g, '&')
  return null
}

function parseVirusScanFollowUrl(html: string): string | null {
  const form = html.match(/<form[^>]*\bid=["']download-form["'][^>]*>([\s\S]*?)<\/form>/i)
  if (form) {
    const action = form[0].match(/\baction=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, '&')
    if (action) {
      const params = new URLSearchParams()
      for (const m of form[1].matchAll(/<input\b[^>]*>/gi)) {
        const tag = m[0]
        if (/type=["']submit["']/i.test(tag)) continue
        const name = /\bname=["']([^"']*)["']/i.exec(tag)?.[1]
        if (!name) continue
        params.append(name, /\bvalue=["']([^"']*)["']/i.exec(tag)?.[1] ?? '')
      }
      try {
        const u = new URL(action, 'https://drive.google.com')
        params.forEach((v, k) => u.searchParams.set(k, v))
        return u.toString()
      } catch {
        /* fall through */
      }
    }
  }
  const usercontent = html.match(/https:\/\/drive\.usercontent\.google\.com\/download[^"'\\s<>)]+/i)
  if (usercontent) return usercontent[0].replace(/&amp;/g, '&')
  const docs = html.match(/href="(\/uc\?export=download[^"]+)/i)
  if (docs) return `https://docs.google.com${docs[1].replace(/&amp;/g, '&')}`
  return null
}

/** Drive API alt=media — works for “Anyone with the link” when an API key is set. */
export async function fetchDriveFileViaApiKey(fileId: string, apiKey: string): Promise<Response | null> {
  const id = fileId.trim()
  const key = apiKey.trim()
  if (!id || !key) return null
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`)
  url.searchParams.set('alt', 'media')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('acknowledgeAbuse', 'true')
  try {
    const res = await fetch(url.toString(), {
      redirect: 'follow',
      headers: {
        Accept: '*/*',
        'User-Agent': BROWSER_LIKE_UA,
        'X-Goog-Api-Key': key,
      },
    })
    if (res.ok && res.body) return res
    return res
  } catch {
    return null
  }
}

/**
 * Follow uc?export=download + virus-scan HTML interstitial (needed for large public GLBs).
 */
export async function fetchDriveFileViaUc(fileId: string): Promise<Response> {
  const init = driveFetchInit()
  const candidates = driveDownloadCandidates(fileId)
  let lastError: Response | null = null

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    let res = await fetch(candidate, init)
    if (!res.ok) {
      lastError = res
      continue
    }

    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    if (
      ct.includes('model/gltf') ||
      ct.includes('octet-stream') ||
      ct.includes('application/zip')
    ) {
      return res
    }

    const buf = new Uint8Array(await res.arrayBuffer())
    if (!isProbablyHtml(buf)) {
      return new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers })
    }

    const html = new TextDecoder('utf8', { fatal: false }).decode(buf)
    const confirm = extractConfirmCode(html)
    if (confirm) {
      const extra = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=${encodeURIComponent(confirm)}`
      if (!candidates.includes(extra)) candidates.push(extra)
    }

    const follow = parseVirusScanFollowUrl(html)
    if (follow) {
      const confirmed = await fetch(follow, init)
      if (confirmed.ok) {
        const cct = (confirmed.headers.get('content-type') ?? '').toLowerCase()
        if (cct.includes('text/html')) {
          const cbuf = new Uint8Array(await confirmed.arrayBuffer())
          if (!isProbablyHtml(cbuf)) {
            return new Response(cbuf, {
              status: confirmed.status,
              statusText: confirmed.statusText,
              headers: confirmed.headers,
            })
          }
          lastError = confirmed
          continue
        }
        return confirmed
      }
      lastError = confirmed
      continue
    }
    lastError = new Response(buf, { status: res.status, headers: res.headers })
  }

  return lastError ?? new Response(null, { status: 502, statusText: 'Drive fetch failed' })
}

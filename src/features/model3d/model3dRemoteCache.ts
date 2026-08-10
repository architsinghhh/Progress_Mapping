/**
 * ASI-style model byte cache for Drive/proxy GLBs.
 * Session memory + Cache Storage (≤96MB) + in-flight dedupe.
 */

const CACHE_NAME = 'pm-site-3d-v1'
const MAX_DISK_CACHE_BYTES = 96 * 1024 * 1024

const sessionBuffers = new Map<string, ArrayBuffer>()
const inFlight = new Map<string, Promise<ArrayBuffer>>()

function glbMagicOk(buf: Uint8Array): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x67 &&
    buf[1] === 0x6c &&
    buf[2] === 0x54 &&
    buf[3] === 0x46
  )
}

function glbDeclaredLengthMatchesSize(head: Uint8Array, totalSize: number): boolean {
  if (!glbMagicOk(head) || head.length < 12 || totalSize < 12) return false
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength)
  return view.getUint32(8, true) === totalSize
}

async function tryReadDisk(url: string): Promise<ArrayBuffer | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const hit = await cache.match(url)
    if (!hit?.ok) return null
    const buf = await hit.arrayBuffer()
    const head = new Uint8Array(buf, 0, Math.min(64, buf.byteLength))
    if (!glbMagicOk(head) || !glbDeclaredLengthMatchesSize(head, buf.byteLength)) {
      await cache.delete(url)
      return null
    }
    if (buf.byteLength > MAX_DISK_CACHE_BYTES) {
      await cache.delete(url)
      return null
    }
    return buf
  } catch {
    return null
  }
}

async function tryWriteDisk(url: string, buf: ArrayBuffer): Promise<void> {
  if (typeof caches === 'undefined') return
  if (buf.byteLength > MAX_DISK_CACHE_BYTES) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      url,
      new Response(buf, {
        headers: {
          'Content-Type': 'model/gltf-binary',
          'Cache-Control': 'private, max-age=2592000',
        },
      }),
    )
  } catch {
    /* quota / private mode */
  }
}

/**
 * Fetch GLB bytes once per URL (session → disk → network).
 * Same ArrayBuffer is reused for GLTFLoader.parse (ASI pattern — no copy).
 */
export async function getOrFetchModelBuffer(
  url: string,
  onProgress?: (pct: number | null) => void,
): Promise<ArrayBuffer> {
  const mem = sessionBuffers.get(url)
  if (mem) {
    onProgress?.(100)
    return mem
  }

  const disk = await tryReadDisk(url)
  if (disk) {
    sessionBuffers.set(url, disk)
    onProgress?.(100)
    return disk
  }

  const pending = inFlight.get(url)
  if (pending) {
    const buf = await pending
    onProgress?.(100)
    return buf
  }

  const work = (async () => {
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const j = (await res.json()) as { error?: string; hint?: string }
        detail = [j.error, j.hint].filter(Boolean).join(' — ') || detail
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }

    const total = Number(res.headers.get('content-length') || 0)
    if (!res.body) {
      const buf = await res.arrayBuffer()
      const head = new Uint8Array(buf, 0, Math.min(12, buf.byteLength))
      if (!glbMagicOk(head)) throw new Error('Downloaded file is not a valid GLB')
      sessionBuffers.set(url, buf)
      void tryWriteDisk(url, buf)
      return buf
    }

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        received += value.length
        if (total > 0) onProgress?.(Math.min(99, Math.round((received / total) * 100)))
        else onProgress?.(null)
      }
    }
    const out = new Uint8Array(received)
    let offset = 0
    for (const c of chunks) {
      out.set(c, offset)
      offset += c.length
    }
    if (!glbMagicOk(out)) throw new Error('Downloaded file is not a valid GLB')
    const buf = out.buffer
    sessionBuffers.set(url, buf)
    void tryWriteDisk(url, buf)
    onProgress?.(100)
    return buf
  })()

  inFlight.set(url, work)
  try {
    return await work
  } finally {
    inFlight.delete(url)
  }
}

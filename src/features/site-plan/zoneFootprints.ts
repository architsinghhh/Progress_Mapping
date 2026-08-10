/**
 * Greenfield zone footprints over the square nadir ortho (0–1000).
 * A zone may be many disconnected chunks (e.g. several residential pads).
 * Trace in the UI; saved traces persist in localStorage.
 */

export type Point2 = [number, number]

export type ZoneFootprint = {
  zoneId: string
  /**
   * One or more closed polygons for the same zone.
   * Legacy `points` (single ring) is normalized into chunks[0] on load.
   */
  chunks: Point2[][]
  /** @deprecated prefer chunks — kept for older localStorage payloads */
  points?: Point2[]
  labelAt: { x: number; y: number }
}

const STORAGE_KEY = 'pm.greenfield.zoneFootprints.v4'

/** Empty starters — draw your own in Trace zones */
export const GREENFIELD_ZONE_FOOTPRINTS: ZoneFootprint[] = [
  { zoneId: 'zone_a', chunks: [[]], labelAt: { x: 200, y: 250 } },
  { zoneId: 'zone_b', chunks: [[]], labelAt: { x: 750, y: 550 } },
  { zoneId: 'zone_c', chunks: [[]], labelAt: { x: 380, y: 580 } },
  { zoneId: 'zone_d', chunks: [[]], labelAt: { x: 400, y: 380 } },
  { zoneId: 'zone_e', chunks: [[]], labelAt: { x: 620, y: 380 } },
]

export function polygonCentroid(points: Point2[]): { x: number; y: number } {
  if (points.length === 0) return { x: 500, y: 500 }
  let x = 0
  let y = 0
  for (const [px, py] of points) {
    x += px
    y += py
  }
  return { x: x / points.length, y: y / points.length }
}

export function allPoints(fp: ZoneFootprint): Point2[] {
  return (fp.chunks ?? []).flat()
}

export function readyChunks(fp: ZoneFootprint): Point2[][] {
  return (fp.chunks ?? []).filter((c) => c.length >= 3)
}

export function isFootprintReady(fp: ZoneFootprint): boolean {
  return readyChunks(fp).length > 0
}

export function normalizeFootprint(raw: Partial<ZoneFootprint> & { zoneId: string }): ZoneFootprint {
  let chunks: Point2[][] = []
  if (Array.isArray(raw.chunks) && raw.chunks.length > 0) {
    chunks = raw.chunks.map((c) => (Array.isArray(c) ? (c as Point2[]) : [])).filter((c) => c.length > 0 || true)
    // Keep at least one (possibly empty) working chunk
    if (chunks.length === 0) chunks = [[]]
  } else if (Array.isArray(raw.points)) {
    chunks = raw.points.length > 0 ? [raw.points as Point2[]] : [[]]
  } else {
    chunks = [[]]
  }
  // Drop trailing empty chunks except keep one empty for drawing
  const solid = chunks.filter((c) => c.length > 0)
  const normalized = solid.length > 0 ? [...solid, []] : [[]]
  const labelPts = solid.flat()
  return {
    zoneId: raw.zoneId,
    chunks: normalized,
    labelAt: polygonCentroid(labelPts.length ? labelPts : [[500, 500]]),
  }
}

export function withChunks(zoneId: string, chunks: Point2[][]): ZoneFootprint {
  return normalizeFootprint({ zoneId, chunks })
}

export function footprintPath(points: Point2[]): string {
  if (points.length === 0) return ''
  const [x0, y0] = points[0]
  return `M ${x0} ${y0} ${points
    .slice(1)
    .map(([x, y]) => `L ${x} ${y}`)
    .join(' ')} Z`
}

/** SVG path for all ready chunks of a zone */
export function footprintMultiPath(fp: ZoneFootprint): string {
  return readyChunks(fp)
    .map((c) => footprintPath(c))
    .join(' ')
}

function readStored(): ZoneFootprint[] | null {
  try {
    // Prefer v2; fall back to v1
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('pm.greenfield.zoneFootprints.v1')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Array<Partial<ZoneFootprint> & { zoneId: string }>
    if (!Array.isArray(parsed)) return null
    return parsed.filter((f) => f && typeof f.zoneId === 'string').map((f) => normalizeFootprint(f))
  } catch {
    return null
  }
}

/** Active footprints: saved traces win; otherwise defaults (may be empty). */
export function getActiveFootprints(): ZoneFootprint[] {
  const stored = typeof localStorage !== 'undefined' ? readStored() : null
  if (!stored || stored.length === 0) {
    return GREENFIELD_ZONE_FOOTPRINTS.map((f) => normalizeFootprint(f))
  }

  const byId = new Map(stored.map((f) => [f.zoneId, f]))
  return GREENFIELD_ZONE_FOOTPRINTS.map((def) => {
    const hit = byId.get(def.zoneId)
    if (hit && isFootprintReady(hit)) return hit
    return normalizeFootprint(def)
  })
}

export function footprintFor(zoneId: string): ZoneFootprint | undefined {
  return getActiveFootprints().find((f) => f.zoneId === zoneId)
}

export function saveFootprints(footprints: ZoneFootprint[]): void {
  const cleaned = footprints.map((f) => normalizeFootprint(f))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
  window.dispatchEvent(new CustomEvent('pm:zone-footprints-changed'))
}

export function clearSavedFootprints(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('pm.greenfield.zoneFootprints.v1')
  window.dispatchEvent(new CustomEvent('pm:zone-footprints-changed'))
}

export function footprintsToTsModule(footprints: ZoneFootprint[]): string {
  const body = footprints
    .map((f) => {
      const n = normalizeFootprint(f)
      const chunks = readyChunks(n)
        .map((chunk) => {
          const pts = chunk.map(([x, y]) => `        [${Math.round(x)}, ${Math.round(y)}]`)
          return `      [\n${pts.join(',\n')}\n      ]`
        })
        .join(',\n')
      const label = n.labelAt
      return `  {
    zoneId: '${n.zoneId}',
    chunks: [
${chunks || '      []'}
    ],
    labelAt: { x: ${Math.round(label.x)}, y: ${Math.round(label.y)} },
  }`
    })
    .join(',\n')

  return `/** Paste into src/features/site-plan/zoneFootprints.ts as GREENFIELD_ZONE_FOOTPRINTS */
export const GREENFIELD_ZONE_FOOTPRINTS = [
${body}
]
`
}

export function hasTracedFootprints(): boolean {
  return getActiveFootprints().some((f) => isFootprintReady(f))
}

export function chunkCount(fp: ZoneFootprint): number {
  return readyChunks(fp).length
}

export function pointCount(fp: ZoneFootprint): number {
  return allPoints(fp).length
}

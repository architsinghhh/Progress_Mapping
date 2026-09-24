import type { DxfEntity, DxfPoint } from '@/features/site-plan/dxf/types'

function bulgeArcPoints(p0: DxfPoint, p1: DxfPoint, bulge: number, segments = 10): DxfPoint[] {
  if (Math.abs(bulge) < 1e-10) return [p1]
  const theta = 4 * Math.atan(bulge)
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const chord = Math.hypot(dx, dy)
  if (chord < 1e-12) return [p1]
  const r = Math.abs(chord / (2 * Math.sin(Math.abs(theta) / 2)))
  const mx = (p0.x + p1.x) / 2
  const my = (p0.y + p1.y) / 2
  const ux = -dy / chord
  const uy = dx / chord
  const d = r * Math.cos(Math.abs(theta) / 2)
  const sign = bulge >= 0 ? 1 : -1
  const cx = mx + sign * d * ux
  const cy = my + sign * d * uy
  const a0 = Math.atan2(p0.y - cy, p0.x - cx)
  const a1 = Math.atan2(p1.y - cy, p1.x - cx)
  let sweep = a1 - a0
  if (bulge > 0) {
    while (sweep < 0) sweep += 2 * Math.PI
  } else {
    while (sweep > 0) sweep -= 2 * Math.PI
  }
  const pts: DxfPoint[] = []
  for (let k = 0; k <= segments; k++) {
    const t = k / segments
    const a = a0 + sweep * t
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return pts
}

function expandPolylineWithBulge(pts: DxfPoint[], bulges: number[], closed: boolean): DxfPoint[] {
  if (pts.length < 2) return pts
  const out: DxfPoint[] = []
  const n = pts.length
  const max = closed ? n : n - 1
  for (let i = 0; i < max; i++) {
    const p0 = pts[i]
    const p1 = pts[(i + 1) % n]
    const b = bulges[i] ?? 0
    out.push(p0)
    if (Math.abs(b) > 1e-8) {
      const arc = bulgeArcPoints(p0, p1, b)
      out.push(...arc.slice(1, -1))
    }
  }
  if (!closed) out.push(pts[n - 1])
  return out
}

export function expandLwpolylineEntity(e: DxfEntity): DxfPoint[] {
  const v = e.vertices as number[] | undefined
  if (!v || v.length < 4) return []
  const pts: DxfPoint[] = []
  for (let j = 0; j < v.length; j += 2) pts.push({ x: v[j], y: v[j + 1] })
  const closed = ((e.flags as number) & 1) === 1
  const bulges = (e.bulges as number[] | undefined) ?? []
  const hasBulge = bulges.some((b) => Math.abs(b) > 1e-10)
  if (!hasBulge) return pts
  return expandPolylineWithBulge(pts, bulges, closed)
}

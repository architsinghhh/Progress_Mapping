import type { DxfEntity, ParsedDxf } from '@/features/site-plan/dxf/types'
import { expandLwpolylineEntity } from '@/features/site-plan/dxf/bulge'

/** Browser DXF R12+ entity parse — adapted from ASI `DxfViewer.parseDxf`. */
export function parseDxf(content: string): ParsedDxf {
  const lines = content.split(/\r?\n/)
  const entities: DxfEntity[] = []
  const layers: Record<string, { name: string; color?: number }> = {}

  let i = 0
  const code = () => parseInt(lines[i]?.trim() ?? '-1', 10)
  const val = () => lines[i + 1]?.trim() ?? ''

  while (i < lines.length) {
    if (lines[i]?.trim() === '0' && lines[i + 1]?.trim() === 'LAYER') {
      i += 2
      let name = ''
      let color: number | undefined
      while (i < lines.length) {
        const c = code()
        const v = val()
        if (c === 2 && !name) name = v
        if (c === 62) color = Math.abs(parseInt(v, 10))
        if (c === 0) break
        i += 2
      }
      if (name) layers[name] = { name, color }
      continue
    }
    i++
  }

  i = 0
  let inEntities = false
  while (i < lines.length) {
    const line = lines[i]?.trim()
    if (line === 'ENTITIES') {
      inEntities = true
      i++
      continue
    }
    if (inEntities && line === 'ENDSEC') break

    if (inEntities && line === '0') {
      i++
      const type = lines[i]?.trim() ?? ''
      if (!type || type === 'ENDSEC') break

      const e: DxfEntity = { type, layer: '0' }
      i++

      while (i < lines.length) {
        const c = parseInt(lines[i]?.trim() ?? '-1', 10)
        if (Number.isNaN(c)) {
          i++
          continue
        }
        const v = lines[i + 1]?.trim() ?? ''
        if (c === 0) break
        if (c === 8) e.layer = v
        if (c === 62) e.color = Math.abs(parseInt(v, 10))
        if (c === 67) e.paperSpace = parseInt(v, 10)
        if (type === 'LINE') {
          if (c === 10) e.x1 = parseFloat(v)
          if (c === 20) e.y1 = parseFloat(v)
          if (c === 11) e.x2 = parseFloat(v)
          if (c === 21) e.y2 = parseFloat(v)
        }
        if (type === 'CIRCLE' || type === 'ARC') {
          if (c === 10) e.cx = parseFloat(v)
          if (c === 20) e.cy = parseFloat(v)
          if (c === 40) e.r = parseFloat(v)
          if (type === 'ARC') {
            if (c === 50) e.startAngle = parseFloat(v)
            if (c === 51) e.endAngle = parseFloat(v)
          }
        }
        if (type === 'LWPOLYLINE') {
          if (c === 70) e.flags = parseInt(v, 10)
          if (c === 10) {
            if (!e.vertices) e.vertices = []
            const verts = e.vertices as number[]
            verts.push(parseFloat(v), 0)
            if (!e.bulges) e.bulges = []
            ;(e.bulges as number[]).push(0)
          }
          if (c === 20) {
            const verts = e.vertices as number[]
            if (verts.length) verts[verts.length - 1] = parseFloat(v)
          }
          if (c === 42) {
            const verts = (e.vertices as number[]) ?? []
            const nVert = Math.floor(verts.length / 2)
            if (nVert > 0) {
              if (!e.bulges) e.bulges = []
              const b = e.bulges as number[]
              while (b.length < nVert) b.push(0)
              b[nVert - 1] = parseFloat(v)
            }
          }
        }
        if (type === 'SPLINE') {
          if (!e.points) e.points = []
          if (c === 10) (e.points as number[]).push(parseFloat(v), 0)
          if (c === 20) {
            const p = e.points as number[]
            p[p.length - 1] = parseFloat(v)
          }
        }
        if (type === 'POLYLINE' || type === 'VERTEX') {
          /* skip 3D polyline mesh for now */
        }
        if (type === 'TEXT' || type === 'MTEXT') {
          if (c === 10) e.x = parseFloat(v)
          if (c === 20) e.y = parseFloat(v)
          if (c === 1 || c === 3) e.text = `${(e.text as string) ?? ''}${v}`
          if (c === 40) e.height = parseFloat(v)
          if (c === 50) e.rotation = parseFloat(v)
        }
        i += 2
      }
      if (!layers[e.layer]) layers[e.layer] = { name: e.layer }
      entities.push(e)
      continue
    }
    i++
  }

  const pts: { x: number; y: number }[] = []
  const add = (x: number, y: number) => {
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y })
  }
  for (const e of entities) {
    if (e.type === 'LINE') {
      add(e.x1 as number, e.y1 as number)
      add(e.x2 as number, e.y2 as number)
    }
    if (e.type === 'CIRCLE' || e.type === 'ARC') {
      const r = (e.r as number) || 0
      add((e.cx as number) - r, (e.cy as number) - r)
      add((e.cx as number) + r, (e.cy as number) + r)
    }
    if (e.type === 'LWPOLYLINE' && e.vertices) {
      const stroke = expandLwpolylineEntity(e)
      if (stroke.length) for (const p of stroke) add(p.x, p.y)
      else {
        const v = e.vertices as number[]
        for (let j = 0; j < v.length; j += 2) add(v[j], v[j + 1])
      }
    }
    if (e.type === 'SPLINE' && e.points) {
      const p = e.points as number[]
      for (let j = 0; j < p.length; j += 2) add(p[j], p[j + 1])
    }
    if ((e.type === 'TEXT' || e.type === 'MTEXT') && e.x != null && e.y != null) {
      add(e.x as number, e.y as number)
    }
  }

  if (!pts.length) {
    return { entities, layers, bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { entities, layers, bounds: { minX, minY, maxX, maxY } }
}

export function computeFit(
  bounds: ParsedDxf['bounds'],
  cw: number,
  ch: number,
): { scale: number; offsetX: number; offsetY: number } {
  const dw = bounds.maxX - bounds.minX
  const dh = bounds.maxY - bounds.minY
  if (dw <= 0 || dh <= 0) return { scale: 1, offsetX: cw / 2, offsetY: ch / 2 }
  const scale = Math.min((cw * 0.9) / dw, (ch * 0.9) / dh)
  const midX = (bounds.minX + bounds.maxX) / 2
  const midY = (bounds.minY + bounds.maxY) / 2
  return { scale, offsetX: cw / 2 - midX * scale, offsetY: ch / 2 + midY * scale }
}

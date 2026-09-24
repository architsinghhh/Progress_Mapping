import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { aciToHex } from '@/features/site-plan/dxf/aciColors'
import { expandLwpolylineEntity } from '@/features/site-plan/dxf/bulge'
import { computeFit, parseDxf } from '@/features/site-plan/dxf/parseDxf'
import { stripMtextFormatting } from '@/features/site-plan/dxf/stripMtext'
import type { ParsedDxf } from '@/features/site-plan/dxf/types'

type Transform = { scale: number; offsetX: number; offsetY: number }

type DxfCanvasViewerProps = {
  /** Public URL to the drawing file */
  src: string
  className?: string
  /** Bump to force reload */
  reloadKey?: number
}

function renderDxf(
  ctx: CanvasRenderingContext2D,
  dxf: ParsedDxf,
  tr: Transform,
  cssW: number,
  cssH: number,
  dpr: number,
) {
  const w = Math.max(1, Math.round(cssW * dpr))
  const h = Math.max(1, Math.round(cssH * dpr))
  if (ctx.canvas.width !== w || ctx.canvas.height !== h) {
    ctx.canvas.width = w
    ctx.canvas.height = h
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cssW, cssH)

  const tx = (x: number, y: number): [number, number] => [
    tr.offsetX + x * tr.scale,
    tr.offsetY - y * tr.scale,
  ]

  // Crisp 1px strokes in screen space (independent of drawing zoom)
  ctx.save()
  ctx.lineWidth = 1
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'butt'
  ctx.imageSmoothingEnabled = false

  for (const e of dxf.entities) {
    if ((e.paperSpace as number) === 1) continue

    const stroke = aciToHex(e.color ?? dxf.layers[e.layer]?.color)
    ctx.strokeStyle = stroke
    ctx.fillStyle = stroke

    if (e.type === 'LINE') {
      const [x1, y1] = tx(e.x1 as number, e.y1 as number)
      const [x2, y2] = tx(e.x2 as number, e.y2 as number)
      ctx.beginPath()
      ctx.moveTo(x1 + 0.5, y1 + 0.5)
      ctx.lineTo(x2 + 0.5, y2 + 0.5)
      ctx.stroke()
    } else if (e.type === 'CIRCLE') {
      const [cx, cy] = tx(e.cx as number, e.cy as number)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(0.5, (e.r as number) * tr.scale), 0, Math.PI * 2)
      ctx.stroke()
    } else if (e.type === 'ARC') {
      const [cx, cy] = tx(e.cx as number, e.cy as number)
      const sa = (-(e.startAngle as number) * Math.PI) / 180
      const ea = (-(e.endAngle as number) * Math.PI) / 180
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(0.5, (e.r as number) * tr.scale), sa, ea, true)
      ctx.stroke()
    } else if (e.type === 'LWPOLYLINE' && e.vertices) {
      const closed = ((e.flags as number) & 1) === 1
      let pts = expandLwpolylineEntity(e)
      if (!pts.length) {
        const v = e.vertices as number[]
        pts = []
        for (let j = 0; j < v.length; j += 2) pts.push({ x: v[j], y: v[j + 1] })
      }
      if (pts.length < 2) continue
      ctx.beginPath()
      for (let j = 0; j < pts.length; j++) {
        const [cx, cy] = tx(pts[j].x, pts[j].y)
        j === 0 ? ctx.moveTo(cx + 0.5, cy + 0.5) : ctx.lineTo(cx + 0.5, cy + 0.5)
      }
      if (closed) ctx.closePath()
      ctx.stroke()
    } else if (e.type === 'SPLINE' && e.points) {
      const p = e.points as number[]
      if (p.length < 4) continue
      ctx.beginPath()
      for (let j = 0; j < p.length; j += 2) {
        const [cx, cy] = tx(p[j], p[j + 1])
        j === 0 ? ctx.moveTo(cx + 0.5, cy + 0.5) : ctx.lineTo(cx + 0.5, cy + 0.5)
      }
      ctx.stroke()
    } else if ((e.type === 'TEXT' || e.type === 'MTEXT') && e.text) {
      const label = stripMtextFormatting(String(e.text))
      if (!label) continue
      // Hide only when extremely zoomed out (unreadable clutter)
      const naturalPx = ((e.height as number) || 1) * tr.scale
      if (naturalPx < 4) continue
      const hPx = Math.min(64, naturalPx)
      const [cx, cy] = tx(e.x as number, e.y as number)
      // Already in screen space (Y down) — do not flip again or labels invert
      const rot = (((e.rotation as number) || 0) * Math.PI) / 180
      ctx.save()
      ctx.translate(cx, cy)
      if (rot) ctx.rotate(-rot)
      ctx.font = `600 ${hPx}px "Segoe UI", ui-sans-serif, system-ui, sans-serif`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillStyle = stroke
      ctx.globalAlpha = 0.95
      ctx.fillText(label.slice(0, 120), 0, 0)
      ctx.restore()
    }
  }
  ctx.restore()
}

/** Canvas drawing viewer — pan, wheel-zoom (scoped), fit. */
export function DxfCanvasViewer({ src, className, reloadKey = 0 }: DxfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState<ParsedDxf | null>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cssSize, setCssSize] = useState({ w: 1, h: 1 })

  const transformRef = useRef(transform)
  const drawingRef = useRef(drawing)
  const cssSizeRef = useRef(cssSize)
  transformRef.current = transform
  drawingRef.current = drawing
  cssSizeRef.current = cssSize

  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDrawing(null)
    void (async () => {
      try {
        const res = await fetch(src, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const type = (res.headers.get('content-type') ?? '').toLowerCase()
        const text = await res.text()
        if (type.includes('text/html') || text.trimStart().startsWith('<!')) {
          throw new Error('Drawing file not found at this path')
        }
        if (!/SECTION/i.test(text) && !/ENTITIES/i.test(text)) {
          throw new Error('File does not look like a site drawing')
        }
        if (cancelled) return
        const parsed = parseDxf(text)
        setDrawing(parsed)
        setLoading(false)
        requestAnimationFrame(() => {
          const c = containerRef.current
          if (!c || cancelled) return
          setTransform(computeFit(parsed.bounds, c.clientWidth || 900, c.clientHeight || 480))
        })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load drawing')
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [src, reloadKey])

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const parsed = drawingRef.current
    if (!canvas || !parsed) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    const { w, h } = cssSizeRef.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    renderDxf(ctx, parsed, transformRef.current, w, h, dpr)
  }, [])

  useLayoutEffect(() => {
    paint()
  }, [transform, drawing, cssSize, paint])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(() => {
      const w = Math.max(1, container.clientWidth)
      const h = Math.max(1, container.clientHeight)
      setCssSize({ w, h })
    })
    obs.observe(container)
    setCssSize({
      w: Math.max(1, container.clientWidth),
      h: Math.max(1, container.clientHeight),
    })
    return () => obs.disconnect()
  }, [])

  // Native wheel with { passive: false } so page scroll does not steal zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const canvas = canvasRef.current
      if (!canvas || !drawingRef.current) return
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setTransform((prev) => {
        const next = Math.min(800, Math.max(0.0005, prev.scale * factor))
        const worldX = (mx - prev.offsetX) / prev.scale
        const worldY = -(my - prev.offsetY) / prev.scale
        return {
          scale: next,
          offsetX: mx - worldX * next,
          offsetY: my + worldY * next,
        }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const fit = () => {
    if (!drawing || !containerRef.current) return
    const c = containerRef.current
    setTransform(computeFit(drawing.bounds, c.clientWidth || 900, c.clientHeight || 480))
  }

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    setTransform((prev) => {
      const next = Math.min(800, Math.max(0.0005, prev.scale * factor))
      const worldX = (mx - prev.offsetX) / prev.scale
      const worldY = -(my - prev.offsetY) / prev.scale
      return {
        scale: next,
        offsetX: mx - worldX * next,
        offsetY: my + worldY * next,
      }
    })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setTransform((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }))
  }
  const onPointerUp = () => {
    dragging.current = false
  }

  return (
    <div className={cn('relative flex h-full min-h-[480px] flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="pdf-viewer__icon-btn" title="Fit drawing" onClick={fit}>
          <Maximize2 className="size-3.5" />
        </button>
        <button
          type="button"
          className="pdf-viewer__icon-btn"
          title="Zoom in"
          onClick={() => {
            const c = containerRef.current
            if (!c) return
            const r = c.getBoundingClientRect()
            zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2)
          }}
        >
          <ZoomIn className="size-3.5" />
        </button>
        <button
          type="button"
          className="pdf-viewer__icon-btn"
          title="Zoom out"
          onClick={() => {
            const c = containerRef.current
            if (!c) return
            const r = c.getBoundingClientRect()
            zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2)
          }}
        >
          <ZoomOut className="size-3.5" />
        </button>
        <span className="ml-auto text-[10px] font-medium text-slate-400">
          Drag to pan · scroll to zoom
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-[480px] flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
        style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
          style={{ width: '100%', height: '100%' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-xs font-semibold text-slate-600">
            Loading drawing…
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/90 p-4 text-center">
            <p className="text-sm font-semibold text-rose-700">Could not open drawing</p>
            <p className="max-w-md text-[11px] text-slate-600">{error}</p>
            <p className="max-w-md text-[11px] text-slate-500">
              Place the master plan drawing in the Sage project folder, then reload.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function DxfReloadButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="pdf-viewer__icon-btn" title="Reload drawing" onClick={onClick}>
      <RefreshCw className="size-3.5" />
    </button>
  )
}

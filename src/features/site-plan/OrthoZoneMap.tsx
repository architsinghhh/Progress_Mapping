import { useCallback, useEffect, useRef, useState, type PointerEvent as RE } from 'react'
import { cn } from '@/shared/lib/utils'
import { captureOrthoTopView } from '@/features/comparison/OrthoTopView'
import { footprintPath, type Point2 } from '@/features/site-plan/zoneFootprints'

export type OrthoZoneLayer = {
  id: string
  color: string
  chunks: Point2[][]
  active?: boolean
  label?: string
  labelAt?: Point2
}

type OrthoZoneMapProps = {
  stageId: string
  label?: string
  className?: string
  zones?: OrthoZoneLayer[]
  draftPoints?: Point2[]
  /** When set, clicks add points in 0–1000 map UV (same space as saved footprints). */
  onMapClick?: (uv: Point2) => void
  pickMode?: boolean
  /**
   * Scroll-zoom + drag-pan. Turn off for Survey Then/Now slider so the wipe
   * handle owns pointer events (still uses the same square nadir still).
   */
  interactive?: boolean
  /**
   * `square` — letterboxed map (Overview zones).
   * `contain` — full site, as large as possible (Survey Then/Now).
   * `cover` — edge-to-edge crop (can feel too zoomed in).
   */
  frame?: 'square' | 'contain' | 'cover'
}

/**
 * Bulletproof zone map:
 * 1) Capture a locked square nadir still of the stage GLB
 * 2) Draw zones as SVG on that same square
 * 3) Zoom/pan transforms image + SVG together — they cannot drift
 */
export function OrthoZoneMap({
  stageId,
  label,
  className,
  zones = [],
  draftPoints,
  onMapClick,
  pickMode = false,
  interactive = true,
  frame = 'square',
}: OrthoZoneMapProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)

  const hostRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const transformRef = useRef({ scale: 1, tx: 0, ty: 0 })
  transformRef.current = { scale, tx, ty }

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setSrc(null)
    setScale(1)
    setTx(0)
    setTy(0)
    void captureOrthoTopView(stageId, 1600)
      .then((url) => {
        if (!alive) return
        setSrc(url)
        setLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Failed to load map')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [stageId])

  // Native non-passive wheel — React's onWheel is passive so preventDefault is ignored
  // and the page scrollbar scrolls while zooming the map.
  useEffect(() => {
    const host = hostRef.current
    const viewport = viewportRef.current
    if (!host || !interactive) return
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const el = viewport ?? host
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const mx = (e.clientX - rect.left) / rect.width
      const my = (e.clientY - rect.top) / rect.height
      const { scale: s0, tx: tx0, ty: ty0 } = transformRef.current
      const next = Math.min(8, Math.max(1, s0 * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
      const cx = 0.5 + tx0 / rect.width
      const cy = 0.5 + ty0 / rect.height
      const wx = (mx - cx) / s0
      const wy = (my - cy) / s0
      const ncx = mx - wx * next
      const ncy = my - wy * next
      setScale(next)
      setTx((ncx - 0.5) * rect.width)
      setTy((ncy - 0.5) * rect.height)
    }
    host.addEventListener('wheel', onWheelNative, { passive: false })
    return () => host.removeEventListener('wheel', onWheelNative)
  }, [interactive])

  const clientToUv = useCallback((clientX: number, clientY: number): Point2 | null => {
    const el = viewportRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    // Position in viewport (0–1)
    const vx = (clientX - rect.left) / rect.width
    const vy = (clientY - rect.top) / rect.height
    // Invert CSS transform around center: translate then scale
    const { scale: s, tx: ox, ty: oy } = transformRef.current
    const cx = 0.5 + ox / rect.width
    const cy = 0.5 + oy / rect.height
    const ux = (vx - cx) / s + 0.5
    const uy = (vy - cy) / s + 0.5
    return [
      Math.min(1000, Math.max(0, ux * 1000)),
      Math.min(1000, Math.max(0, uy * 1000)),
    ]
  }, [])

  const onPointerDown = (e: RE<HTMLDivElement>) => {
    if (!interactive && !pickMode) return
    dragging.current = interactive
    moved.current = false
    last.current = { x: e.clientX, y: e.clientY }
    if (interactive) e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: RE<HTMLDivElement>) => {
    if (!interactive || !dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true
    last.current = { x: e.clientX, y: e.clientY }
    setTx((v) => v + dx)
    setTy((v) => v + dy)
  }

  const onPointerUp = (e: RE<HTMLDivElement>) => {
    dragging.current = false
    if (interactive) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    if (pickMode && onMapClick && !moved.current) {
      const uv = clientToUv(e.clientX, e.clientY)
      if (uv) onMapClick(uv)
    }
  }

  const resetView = () => {
    setScale(1)
    setTx(0)
    setTy(0)
  }

  return (
    <div
      ref={hostRef}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden overscroll-none bg-[#d6d0c2]',
        className,
      )}
    >
      <div
        ref={viewportRef}
        className={cn(
          'relative select-none',
          frame === 'square'
            ? 'aspect-square h-full max-h-full w-auto max-w-full'
            : 'absolute inset-0 h-full w-full',
          interactive || pickMode ? 'touch-none' : 'pointer-events-none',
          pickMode
            ? 'cursor-crosshair'
            : interactive
              ? 'cursor-grab active:cursor-grabbing'
              : 'cursor-default',
        )}
        onPointerDown={interactive || pickMode ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive || pickMode ? onPointerUp : undefined}
        onPointerCancel={interactive || pickMode ? onPointerUp : undefined}
      >
        <div
          className="absolute inset-0 origin-center will-change-transform"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          }}
        >
          {src ? (
            <img
              src={src}
              alt={label ?? 'Top view ortho'}
              className={cn(
                'pointer-events-none absolute inset-0 h-full w-full',
                frame === 'cover' && 'object-cover',
                frame === 'contain' && 'object-contain',
                frame === 'square' && 'object-fill',
              )}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-[#d6d0c2]" />
          )}

          <svg
            viewBox="0 0 1000 1000"
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio={
              frame === 'cover' ? 'xMidYMid slice' : frame === 'contain' ? 'xMidYMid meet' : 'none'
            }
          >
            {zones.map((z) =>
              z.chunks.map((chunk, i) =>
                chunk.length >= 3 ? (
                  <path
                    key={`${z.id}-${i}`}
                    d={footprintPath(chunk)}
                    fill={z.active ? `${z.color}55` : `${z.color}28`}
                    stroke={z.color}
                    strokeWidth={z.active ? 5 : 3}
                    strokeLinejoin="round"
                  />
                ) : null,
              ),
            )}
            {zones.map((z) =>
              z.label && z.labelAt ? (
                <g key={`lbl-${z.id}`}>
                  <rect
                    x={z.labelAt[0] - 52}
                    y={z.labelAt[1] - 14}
                    width="104"
                    height="28"
                    rx="6"
                    fill="rgba(15,23,42,0.82)"
                  />
                  <text
                    x={z.labelAt[0]}
                    y={z.labelAt[1] + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="Outfit, sans-serif"
                  >
                    {z.label}
                  </text>
                </g>
              ) : null,
            )}
            {draftPoints && draftPoints.length >= 2 ? (
              <polyline
                points={draftPoints.map(([x, y]) => `${x},${y}`).join(' ')}
                fill="none"
                stroke="#fff"
                strokeWidth={3}
                strokeDasharray="8 5"
              />
            ) : null}
            {draftPoints?.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i === draftPoints.length - 1 ? 7 : 5}
                fill="#38bdf8"
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </svg>
        </div>

        {label ? (
          <div className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-ink/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
            {label}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#d6d0c2]/90 text-[11px] font-semibold text-slate-600">
          Loading top view…
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-rose-50 px-4 text-center text-[11px] text-rose-800">
          <span className="font-semibold">Could not load top view</span>
          <span className="max-w-sm text-rose-600/90">{error}</span>
        </div>
      ) : null}

      {!loading && src && interactive ? (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex gap-1">
          <button
            type="button"
            className="pointer-events-auto rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 shadow hover:bg-white"
            onClick={resetView}
          >
            Reset view
          </button>
          <span className="rounded bg-white/85 px-1.5 py-0.5 text-[9px] text-slate-500">
            Scroll zoom · drag pan
          </span>
        </div>
      ) : null}
    </div>
  )
}

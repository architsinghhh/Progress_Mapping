import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/shared/lib/utils'
import { captureOrthoTopView } from '@/features/comparison/OrthoTopView'

type StillState = {
  src: string | null
  loading: boolean
  error: string | null
}

const idle: StillState = { src: null, loading: true, error: null }

const BASE_SCALE = 1.15
const MIN_ZOOM = 0.7
const MAX_ZOOM = 4

/**
 * Load Then + Now nadir stills one after another (never in parallel).
 * Dual WebGL captures were leaving the Now pane blank.
 */
function useOrthoPair(thenStageId: string, nowStageId: string) {
  const [then, setThen] = useState<StillState>(idle)
  const [now, setNow] = useState<StillState>(idle)

  useEffect(() => {
    let alive = true
    setThen(idle)
    setNow(idle)

    void (async () => {
      try {
        const url = await captureOrthoTopView(thenStageId, 1600)
        if (!alive) return
        setThen({ src: url, loading: false, error: null })
      } catch (e) {
        if (!alive) return
        setThen({
          src: null,
          loading: false,
          error: e instanceof Error ? e.message : 'Then capture failed',
        })
      }

      try {
        const url = await captureOrthoTopView(nowStageId, 1600)
        if (!alive) return
        setNow({ src: url, loading: false, error: null })
      } catch (e) {
        if (!alive) return
        setNow({
          src: null,
          loading: false,
          error: e instanceof Error ? e.message : 'Now capture failed',
        })
      }
    })()

    return () => {
      alive = false
    }
  }, [thenStageId, nowStageId])

  return { then, now }
}

function StillPane({
  state,
  className,
  label,
  fill,
}: {
  state: StillState
  className?: string
  label?: string
  /** absolute inset-0 for slider stack; relative fill for side panes */
  fill?: 'absolute' | 'relative'
}) {
  return (
    <div
      className={cn(
        'overflow-hidden bg-[#d6d0c2]',
        fill === 'relative' ? 'relative h-full min-h-[420px] w-full' : 'absolute inset-0',
        className,
      )}
    >
      {state.src ? (
        <img
          src={state.src}
          alt={label ?? 'Ortho top view'}
          className="h-full w-full origin-center object-contain"
          style={{ transform: `scale(${BASE_SCALE})` }}
          draggable={false}
        />
      ) : null}
      {state.loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#d6d0c2]/85 text-[11px] font-semibold text-slate-600">
          Loading top view…
        </div>
      ) : null}
      {state.error && !state.src ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-rose-50/95 px-4 text-center text-[11px] text-rose-800">
          <span className="font-semibold">Could not load top view</span>
          <span className="max-w-sm text-rose-600/90">{state.error}</span>
        </div>
      ) : null}
    </div>
  )
}

/** Side-by-side pane: independent scroll-zoom + drag-pan. */
function ZoomableStillPane({
  state,
  label,
}: {
  state: StillState
  label?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(BASE_SCALE)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const transformRef = useRef({ scale: BASE_SCALE, tx: 0, ty: 0 })
  transformRef.current = { scale, tx, ty }
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  // Reset transform when the still changes
  useEffect(() => {
    setScale(BASE_SCALE)
    setTx(0)
    setTy(0)
  }, [state.src])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = host.getBoundingClientRect()
      const mx = e.clientX - rect.left - rect.width / 2
      const my = e.clientY - rect.top - rect.height / 2
      const { scale: s0, tx: tx0, ty: ty0 } = transformRef.current
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const s1 = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s0 * factor))
      const k = s1 / s0
      setScale(s1)
      setTx(mx - k * (mx - tx0))
      setTy(my - k * (my - ty0))
    }
    host.addEventListener('wheel', onWheel, { passive: false })
    return () => host.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setTx((v) => v + dx)
    setTy((v) => v + dy)
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div
      ref={hostRef}
      className="relative h-full min-h-[420px] w-full touch-none overflow-hidden bg-[#d6d0c2]"
      style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {state.src ? (
        <img
          src={state.src}
          alt={label ?? 'Ortho top view'}
          className="pointer-events-none absolute inset-0 m-auto h-full w-full origin-center object-contain select-none"
          style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
          draggable={false}
        />
      ) : null}
      {state.loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#d6d0c2]/85 text-[11px] font-semibold text-slate-600">
          Loading top view…
        </div>
      ) : null}
      {state.error && !state.src ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-rose-50/95 px-4 text-center text-[11px] text-rose-800">
          <span className="font-semibold">Could not load top view</span>
          <span className="max-w-sm text-rose-600/90">{state.error}</span>
        </div>
      ) : null}
      {state.src && !state.loading ? (
        <div className="pointer-events-none absolute right-2 bottom-2 z-10 rounded-md bg-slate-900/55 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur">
          Scroll zoom · drag pan
        </div>
      ) : null}
    </div>
  )
}

/** Slider wipe: Now underneath, Then clipped on the left. */
export function OrthoCompareSlider({
  thenStageId,
  nowStageId,
  sliderPosition,
}: {
  thenStageId: string
  nowStageId: string
  sliderPosition: number
}) {
  const { then, now } = useOrthoPair(thenStageId, nowStageId)

  return (
    <>
      <StillPane state={now} label="Now" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <StillPane state={then} label="Then" />
      </div>
    </>
  )
}

/** Side-by-side panes — each frame zooms/pans independently. */
export function OrthoCompareSideBySide({
  thenStageId,
  nowStageId,
  thenLabel,
  nowLabel,
}: {
  thenStageId: string
  nowStageId: string
  thenLabel: string
  nowLabel: string
}) {
  const { then, now } = useOrthoPair(thenStageId, nowStageId)

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
      <div className="compare-frame compare-frame--static relative min-h-[420px] flex-1 overflow-hidden">
        <ZoomableStillPane state={then} label={thenLabel} />
        <div className="compare-tag left-2">{thenLabel}</div>
      </div>
      <div className="compare-frame compare-frame--static relative min-h-[420px] flex-1 overflow-hidden">
        <ZoomableStillPane state={now} label={nowLabel} />
        <div className="compare-tag left-2">{nowLabel}</div>
      </div>
    </div>
  )
}

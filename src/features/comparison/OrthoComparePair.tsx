import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { captureOrthoTopView } from '@/features/comparison/OrthoTopView'

type StillState = {
  src: string | null
  loading: boolean
  error: string | null
}

const idle: StillState = { src: null, loading: true, error: null }

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
          style={{ transform: 'scale(1.50)' }}
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

/** Side-by-side panes sharing the same sequential loader. */
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
        <StillPane state={then} label={thenLabel} fill="relative" />
        <div className="compare-tag left-2">{thenLabel}</div>
      </div>
      <div className="compare-frame compare-frame--static relative min-h-[420px] flex-1 overflow-hidden">
        <StillPane state={now} label={nowLabel} fill="relative" />
        <div className="compare-tag left-2">{nowLabel}</div>
      </div>
    </div>
  )
}

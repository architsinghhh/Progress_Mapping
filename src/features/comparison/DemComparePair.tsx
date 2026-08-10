import { cn } from '@/shared/lib/utils'

type DemStillProps = {
  src: string | null
  label?: string
  className?: string
  /** absolute for slider stack; relative for side panes */
  fill?: 'absolute' | 'relative'
}

/** Single DEM survey still (or pending placeholder). */
export function DemStill({ src, label, className, fill = 'absolute' }: DemStillProps) {
  return (
    <div
      className={cn(
        'overflow-hidden bg-[#1e293b]',
        fill === 'relative' ? 'relative h-full min-h-[420px] w-full' : 'absolute inset-0',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={label ?? 'DEM'}
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-semibold text-slate-200">DEM still pending</p>
          <p className="max-w-xs text-[11px] text-slate-400">
            {label ?? 'This stage'} — drop Stage5 / Stage6 PNGs in public/media/DEMs when ready.
          </p>
        </div>
      )}
      {label ? <div className="compare-tag left-2">{label}</div> : null}
    </div>
  )
}

export function DemCompareSideBySide({
  thenSrc,
  nowSrc,
  thenLabel,
  nowLabel,
}: {
  thenSrc: string | null
  nowSrc: string | null
  thenLabel: string
  nowLabel: string
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
      <DemStill src={thenSrc} label={thenLabel} fill="relative" />
      <DemStill src={nowSrc} label={nowLabel} fill="relative" />
    </div>
  )
}

export function DemCompareSlider({
  thenSrc,
  nowSrc,
  sliderPosition,
}: {
  thenSrc: string | null
  nowSrc: string | null
  sliderPosition: number
}) {
  return (
    <>
      <DemStill src={nowSrc} />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <DemStill src={thenSrc} />
      </div>
    </>
  )
}

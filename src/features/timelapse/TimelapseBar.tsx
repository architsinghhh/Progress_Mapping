import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { cn, formatMonthYear } from '@/shared/lib/utils'
import { Play, Pause } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = {
  /** Slim mode when header is scrolled */
  compact?: boolean
  /** Nested inside header chrome (no outer card shadow) */
  embedded?: boolean
}

export function TimelapseBar({ compact = false, embedded = false }: Props) {
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const setMissionIndex = useAppStore((s) => s.setMissionIndex)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || missions.length === 0) return
    const id = window.setInterval(() => {
      const current = useAppStore.getState().activeMissionIndex
      setMissionIndex((current + 1) % missions.length)
    }, 1600)
    return () => window.clearInterval(id)
  }, [playing, missions.length, setMissionIndex])

  if (missions.length === 0) return null

  const active = missions[activeMissionIndex]
  const progressPct =
    missions.length <= 1 ? 0 : (activeMissionIndex / (missions.length - 1)) * 100

  return (
    <div
      className={cn(
        'timelapse',
        embedded && 'timelapse--embedded',
        compact && 'timelapse--compact',
      )}
    >
      {!compact ? (
        <div className="timelapse__top">
          <div className="timelapse__controls">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="play-btn"
              aria-label={playing ? 'Pause timelapse' : 'Play timelapse'}
            >
              {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
            </button>
            <div>
              <div className="timelapse__eyebrow">Project timeline</div>
              <div className="timelapse__title">
                {active?.label}
                <span className="timelapse__day">
                  {active ? formatMonthYear(active.date) : '—'} · Day {active?.dayOffset}
                </span>
              </div>
            </div>
          </div>
          <p className="timelapse__notes">{active?.notes}</p>
        </div>
      ) : (
        <div className="timelapse__compact-head">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="play-btn play-btn--sm"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
          </button>
          <span className="timelapse__compact-label">Timeline</span>
          <span className="timelapse__day">{active?.label}</span>
        </div>
      )}

      <div className="timelapse__track-wrap" style={{ ['--timelapse-n' as string]: missions.length }}>
        <div className="timelapse__rail" aria-hidden>
          <div className="timelapse__rail-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <ol className="timelapse__steps">
          {missions.map((m, i) => {
            const isActive = i === activeMissionIndex
            const isPast = i <= activeMissionIndex
            const dateLabel = formatMonthYear(m.date)
            return (
              <li key={m.id} className="timelapse__step">
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false)
                    setMissionIndex(i)
                  }}
                  className={cn('timelapse__step-btn', isActive && 'is-active', isPast && 'is-past')}
                  title={`${m.label} · ${dateLabel}`}
                  aria-label={`${m.label}, ${dateLabel}`}
                >
                  <motion.span
                    className="timelapse__dot"
                    animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                    transition={{ repeat: isActive ? Infinity : 0, duration: 1.6 }}
                  />
                  {!compact ? (
                    <span className="timelapse__step-label">{m.label}</span>
                  ) : null}
                  <span className="timelapse__step-date">{dateLabel}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

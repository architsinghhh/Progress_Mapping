import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { cn, formatMonthYear } from '@/shared/lib/utils'
import { Play, Pause } from 'lucide-react'
import { useEffect, useState } from 'react'

export function TimelapseBar() {
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
    <div className="timelapse">
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
            <div className="timelapse__eyebrow">3D / Ortho Timelapse</div>
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

      <div className="timelapse__track-wrap" style={{ ['--timelapse-n' as string]: missions.length }}>
        <div className="timelapse__rail" aria-hidden>
          <div className="timelapse__rail-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <ol className="timelapse__steps">
          {missions.map((m, i) => {
            const isActive = i === activeMissionIndex
            const isPast = i <= activeMissionIndex
            return (
              <li key={m.id} className="timelapse__step">
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false)
                    setMissionIndex(i)
                  }}
                  className={cn('timelapse__step-btn', isActive && 'is-active', isPast && 'is-past')}
                >
                  <motion.span
                    className="timelapse__dot"
                    animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                    transition={{ repeat: isActive ? Infinity : 0, duration: 1.6 }}
                  />
                  <span className="timelapse__step-label">{m.label}</span>
                  <span className="timelapse__step-date">{formatMonthYear(m.date)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

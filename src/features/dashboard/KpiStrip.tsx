import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, AlertTriangle, CalendarClock, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import { cn } from '@/shared/lib/utils'
import { SiteProgressBreakdown } from '@/features/dashboard/SiteProgressBreakdown'

type OpenPanel = 'progress' | 'variance' | null

export function KpiStrip() {
  const project = useAppStore((s) => s.project)
  const zones = useAppStore((s) => s.zones)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const forecasts = useAppStore((s) => s.forecasts)
  const whatIfActive = useAppStore((s) => s.whatIfActive)
  const toggleWhatIf = useAppStore((s) => s.toggleWhatIf)
  const selectZone = useAppStore((s) => s.selectZone)
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)

  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaled = useMemo(
    () => zones.map((z) => scaleZoneForMission(z, factor)),
    [zones, factor],
  )
  const avg = scaled.length
    ? Math.round(scaled.reduce((s, z) => s + z.overallProgress, 0) / scaled.length)
    : 0
  const behindZones = scaled.filter((z) => z.scheduleStatus === 'behind')
  const behind = behindZones.length
  const peakSlip = forecasts.reduce((m, f) => Math.max(m, f.slipDays), 0)
  const criticalSlip = forecasts
    .filter((f) => f.criticalPath)
    .reduce((m, f) => Math.max(m, f.slipDays), 0)
  const varianceDays = whatIfActive
    ? Math.max(0, Math.max(criticalSlip, peakSlip) - 3)
    : Math.max(criticalSlip, peakSlip)
  const mission = missions[activeMissionIndex]
  const totalAcres = project?.totalAreaAcres ?? 0
  const displayBehind = whatIfActive ? Math.max(0, behind - 1) : behind
  const displayAvg = whatIfActive ? Math.min(100, avg + 4) : avg

  return (
    <div className="kpi-shell">
      <div className="kpi-row">
        <button
          type="button"
          className={cn('kpi-tile', openPanel === 'progress' && 'is-active')}
          onClick={() => setOpenPanel((p) => (p === 'progress' ? null : 'progress'))}
        >
          <span className="kpi-tile__icon kpi-tile__icon--sky">
            <Activity className="size-4" />
          </span>
          <span className="kpi-tile__body">
            <span className="kpi-tile__label">Site progress</span>
            <span className="kpi-tile__value">{displayAvg}%</span>
            <span className="kpi-tile__meta">
              {whatIfActive ? 'What-if +4 pts' : `Survey day ${mission?.dayOffset ?? 0}`}
            </span>
          </span>
          <span className="kpi-tile__action">View breakdown</span>
        </button>

        <div className="kpi-tile kpi-tile--static has-tip">
          <span className="kpi-tile__icon kpi-tile__icon--amber">
            <AlertTriangle className="size-4" />
          </span>
          <span className="kpi-tile__body">
            <span className="kpi-tile__label">Behind schedule</span>
            <span className="kpi-tile__value">{displayBehind}</span>
            <span className={cn('kpi-tile__meta', displayBehind ? 'is-warn' : 'is-good')}>
              {displayBehind ? 'Hover to see zones' : 'All zones on plan'}
            </span>
          </span>

          <div className="kpi-float" role="tooltip">
            <p className="kpi-float__title">Lagging areas</p>
            {behindZones.length === 0 ? (
              <p className="kpi-float__empty">Nothing behind at this survey snapshot.</p>
            ) : (
              <ul>
                {behindZones.map((z) => (
                  <li key={z.id}>
                    <button type="button" onClick={() => void selectZone(z.id)}>
                      <strong>
                        {z.code} · {z.name}
                      </strong>
                      <span>
                        {z.overallProgress}% · {z.remark || z.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          type="button"
          className={cn('kpi-tile', openPanel === 'variance' && 'is-active')}
          onClick={() => setOpenPanel((p) => (p === 'variance' ? null : 'variance'))}
        >
          <span className="kpi-tile__icon kpi-tile__icon--indigo">
            <CalendarClock className="size-4" />
          </span>
          <span className="kpi-tile__body">
            <span className="kpi-tile__label">Schedule variance</span>
            <span className="kpi-tile__value">
              {varianceDays === 0 ? '0d' : `${varianceDays}d`}
            </span>
            <span className={cn('kpi-tile__meta', varianceDays ? 'is-warn' : 'is-good')}>
              {varianceDays === 0 ? 'Planned = actual' : 'Net delay vs plan'}
            </span>
          </span>
          <span className="kpi-tile__action">Open variance</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {openPanel === 'progress' ? (
          <motion.div
            key="progress"
            className="kpi-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="kpi-stage__head">
              <div>
                <p className="kpi-stage__eyebrow">Home · Analytics</p>
                <h3>Overall progress breakdown</h3>
              </div>
              <button
                type="button"
                className="kpi-stage__close"
                aria-label="Close"
                onClick={() => setOpenPanel(null)}
              >
                <X className="size-4" />
              </button>
            </header>
              <SiteProgressBreakdown zones={scaled} totalAcres={totalAcres} />
          </motion.div>
        ) : null}

        {openPanel === 'variance' ? (
          <motion.div
            key="variance"
            className="kpi-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="kpi-stage__head">
              <div>
                <p className="kpi-stage__eyebrow">Home · Schedule</p>
                <h3>Schedule variance</h3>
              </div>
              <button
                type="button"
                className="kpi-stage__close"
                aria-label="Close"
                onClick={() => setOpenPanel(null)}
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="variance-board">
              <div className="variance-board__list">
                {forecasts.map((f) => {
                  const zone = scaled.find((z) => z.id === f.zoneId)
                  const slip =
                    whatIfActive && f.zoneId === 'zone_a'
                      ? Math.max(0, f.slipDays - 3)
                      : f.slipDays
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className="variance-card"
                      onClick={() => void selectZone(f.zoneId)}
                    >
                      <div className="variance-card__top">
                        <div>
                          <p className="variance-card__zone">
                            {zone ? `${zone.code} · ${zone.name}` : 'Zone'}
                          </p>
                          <p className="variance-card__phase">{f.phase}</p>
                        </div>
                        <span className={cn('variance-badge', slip === 0 ? 'good' : slip > 7 ? 'bad' : 'warn')}>
                          {slip === 0 ? 'On plan' : `${slip}d late`}
                        </span>
                      </div>
                      <div className="variance-card__cols">
                        <div>
                          <span>Planned</span>
                          <strong>Day {mission?.dayOffset ?? 0}</strong>
                          <em>On target path</em>
                        </div>
                        <div>
                          <span>Actual</span>
                          <strong>{slip === 0 ? 'Matched' : `+${slip}d`}</strong>
                          <em>{slip === 0 ? 'No open slip' : f.slipRange}</em>
                        </div>
                      </div>
                      <p className="variance-card__note">{f.impact}</p>
                    </button>
                  )
                })}
              </div>

              <div className={cn('whatif-panel', whatIfActive && 'is-on')}>
                <div className="whatif-panel__top">
                  <div>
                    <p className="whatif-panel__kicker">What-if simulator</p>
                    <h4>{whatIfActive ? 'Crew shift active' : 'Protect critical path'}</h4>
                  </div>
                  <button
                    type="button"
                    className={cn('whatif-switch', whatIfActive && 'is-on')}
                    onClick={toggleWhatIf}
                    aria-pressed={whatIfActive}
                    aria-label={whatIfActive ? 'Turn what-if off' : 'Turn what-if on'}
                  >
                    <span className="whatif-switch__track">
                      <span className="whatif-switch__knob" />
                    </span>
                    <span className="whatif-switch__label">{whatIfActive ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
                <p>
                  {whatIfActive
                    ? 'Moving 20 workers from buffer zones into the critical package — variance −3 days in this model.'
                    : 'Simulate shifting 20 workers from a buffer package onto the critical path and preview the variance change.'}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import { cn } from '@/shared/lib/utils'
import { Activity, AlertTriangle, CalendarClock, Layers3 } from 'lucide-react'

export function KpiStrip() {
  const zones = useAppStore((s) => s.zones)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const forecasts = useAppStore((s) => s.forecasts)
  const volumes = useAppStore((s) => s.volumes)
  const whatIfActive = useAppStore((s) => s.whatIfActive)
  const toggleWhatIf = useAppStore((s) => s.toggleWhatIf)

  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaled = zones.map((z) => scaleZoneForMission(z, factor))
  const avg = scaled.length
    ? Math.round(scaled.reduce((s, z) => s + z.overallProgress, 0) / scaled.length)
    : 0
  const behind = scaled.filter((z) => z.scheduleStatus === 'behind').length
  const criticalSlip = forecasts.filter((f) => f.criticalPath).reduce((m, f) => Math.max(m, f.slipDays), 0)
  const rockLeft = volumes.find((v) => v.rockRemainingM3)?.rockRemainingM3 ?? 0
  const mission = missions[activeMissionIndex]

  const kpis = [
    {
      id: 'avg',
      label: 'Site progress',
      value: `${whatIfActive ? Math.min(100, avg + 4) : avg}%`,
      delta: whatIfActive ? '+4% what-if' : `Day ${mission?.dayOffset ?? 0}`,
      tone: 'neutral' as const,
      icon: Activity,
    },
    {
      id: 'risk',
      label: 'Behind schedule',
      value: String(whatIfActive ? Math.max(0, behind - 1) : behind),
      delta: behind ? 'zones lagging' : 'all on schedule',
      tone: behind ? ('warn' as const) : ('good' as const),
      icon: AlertTriangle,
    },
    {
      id: 'slip',
      label: 'Critical slip',
      value: whatIfActive ? `${Math.max(0, criticalSlip - 3)}d` : `${criticalSlip}d`,
      delta: whatIfActive ? 'mitigated −3d' : 'forecast peak',
      tone: criticalSlip > 7 ? ('bad' as const) : ('warn' as const),
      icon: CalendarClock,
    },
    {
      id: 'rock',
      label: 'Rock remaining',
      value: `${rockLeft.toLocaleString()} m³`,
      delta: 'Zone E DEM',
      tone: 'bad' as const,
      icon: Layers3,
    },
  ]

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <motion.div
              key={k.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="kpi-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.value}</div>
                  <div
                    className={cn(
                      'kpi-delta',
                      k.tone === 'good' && 'text-emerald-600',
                      k.tone === 'warn' && 'text-amber-600',
                      k.tone === 'bad' && 'text-rose-600',
                    )}
                  >
                    {k.delta}
                  </div>
                </div>
                <span className="kpi-icon">
                  <Icon className="size-4" />
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <motion.button
        type="button"
        onClick={toggleWhatIf}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('whatif-card', whatIfActive && 'is-active')}
      >
        <div className="text-[10px] font-bold tracking-[0.14em] text-[#94a3b8] uppercase">
          What-if simulator
        </div>
        <div className="mt-1 font-display text-sm font-bold text-[#0f172a]">
          {whatIfActive ? 'Reallocating B → A' : 'Shift 20 workers B → A'}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-[#64748b]">
          {whatIfActive
            ? 'Tower slip −3 days · School still ahead. Toggle off to reset.'
            : 'Use School buffer to protect Tower critical path.'}
        </p>
        <span className="whatif-toggle">{whatIfActive ? 'ON' : 'OFF'}</span>
      </motion.button>
    </div>
  )
}

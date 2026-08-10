import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { ScheduleLegend } from '@/shared/ui/ScheduleLegend'
import { cn } from '@/shared/lib/utils'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'

export function ZoneProgressStrip() {
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const selectZone = useAppStore((s) => s.selectZone)
  const project = useAppStore((s) => s.project)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const whatIfActive = useAppStore((s) => s.whatIfActive)
  const pulseCriticalPath = useAppStore((s) => s.pulseCriticalPath)

  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaled = zones.map((z) => {
    let s = scaleZoneForMission(z, factor)
    if (whatIfActive && z.id === 'zone_a') {
      s = {
        ...s,
        overallProgress: Math.min(100, s.overallProgress + 4),
        scheduleStatus: s.scheduleStatus === 'behind' ? 'on_track' : s.scheduleStatus,
      }
    }
    if (whatIfActive && z.id === 'zone_b') {
      s = { ...s, overallProgress: Math.max(0, s.overallProgress - 2) }
    }
    return s
  })

  const avg =
    scaled.length === 0
      ? 0
      : Math.round(scaled.reduce((s, z) => s + z.overallProgress, 0) / scaled.length)

  return (
    <div className="space-y-2">
      <ScheduleLegend />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <motion.div
          className="zone-card zone-card--site"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-[10px] font-bold tracking-[0.14em] text-[#94a3b8] uppercase">
            Site progress
          </div>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-display text-3xl font-extrabold tracking-tight text-[#0f172a]">
              {avg}%
            </span>
            <span className="mb-1 text-xs text-[#64748b]">overall</span>
          </div>
          <div className="mt-1 text-[11px] text-[#64748b]">
            {project?.type ?? 'project'} · {missions[activeMissionIndex]?.label ?? 'pilot'}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
              animate={{ width: `${avg}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.div>

        {scaled.map((zone, i) => {
          const active = zone.id === selectedZoneId
          const pulse = pulseCriticalPath && (zone.scheduleStatus === 'behind' || zone.id === 'zone_e')
          return (
            <motion.button
              key={zone.id}
              type="button"
              onClick={() => void selectZone(zone.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * (i + 1) }}
              data-status={zone.scheduleStatus}
              className={cn('zone-card', active && 'is-active', pulse && 'zone-card--pulse')}
              style={{ ['--card-accent' as string]: zone.color }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-[#0f172a]">
                  <span style={{ color: zone.color }}>{zone.code}</span>
                  <span className="text-[#94a3b8]"> · </span>
                  {zone.name}
                </span>
              </div>
              <StatusBadge status={zone.scheduleStatus} remark={zone.remark} />
              <ProgressBar
                value={zone.overallProgress}
                status={zone.scheduleStatus}
                className="mt-2.5"
                showLabel={false}
              />
              <div className="mt-1.5 flex justify-between text-[10px] font-medium text-[#64748b]">
                <span>{zone.overallProgress}% done</span>
                <span>
                  {zone.floorsPlanned > 0
                    ? `${zone.floorsComplete}/${zone.floorsPlanned} fl`
                    : 'No floors'}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

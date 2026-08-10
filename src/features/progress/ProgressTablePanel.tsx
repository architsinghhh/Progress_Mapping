import { motion, AnimatePresence } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { useAppStore } from '@/store/appStore'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { missionFactor, scaleProgressForMission } from '@/shared/lib/missionScale'

export function ProgressTablePanel() {
  const progress = useAppStore((s) => s.progress)
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const setHighlightPhase = useAppStore((s) => s.setHighlightPhase)
  const highlightPhase = useAppStore((s) => s.highlightPhase)
  const loading = useAppStore((s) => s.loading)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const openEvidence = useAppStore((s) => s.openEvidence)
  const whatIfActive = useAppStore((s) => s.whatIfActive)
  const pulseCriticalPath = useAppStore((s) => s.pulseCriticalPath)

  const zone = zones.find((z) => z.id === selectedZoneId)
  const factor = missionFactor(activeMissionIndex, missions.length)
  let rows = scaleProgressForMission(progress, factor)
  if (whatIfActive && selectedZoneId === 'zone_a') {
    rows = rows.map((r) =>
      r.phase === 'superstructure'
        ? {
            ...r,
            onsitePercent: Math.min(100, r.onsitePercent + 6),
            status: r.onsitePercent + 6 >= r.plannedPercent - 3 ? 'on_track' : r.status,
          }
        : r,
    )
  }

  return (
    <Panel
      title="Detailed Progress"
      accent="gold"
      action={
        zone && (
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            <span className="font-display font-bold text-[#0f172a]">{zone.name}</span>
            <span>·</span>
            <span>{missions[activeMissionIndex]?.label}</span>
            <span className="hidden sm:inline">· click row for evidence</span>
          </div>
        )
      }
      className="h-full"
      bodyClassName="overflow-auto scrollbar-thin"
    >
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_1fr_0.8fr_1.4fr] gap-2 border-b border-slate-200/80 px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] text-[#94a3b8] uppercase">
          <span>Progress</span>
          <span>Planned</span>
          <span>Onsite</span>
          <span>Status</span>
          <span>Image</span>
          <span>Remark</span>
        </div>

        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (
            rows.map((item, idx) => {
              const active =
                highlightPhase === item.phase ||
                highlightPhase === item.element ||
                (pulseCriticalPath && item.status === 'behind')
              const dimmed = highlightPhase != null && !active
              return (
                  <motion.button
                  key={item.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onMouseEnter={() => setHighlightPhase(item.element ?? item.phase)}
                  onMouseLeave={() => setHighlightPhase(null)}
                  onClick={() => openEvidence(item.id)}
                  className={cn(
                    'progress-row grid w-full grid-cols-[1.2fr_0.7fr_0.7fr_1fr_0.8fr_1.4fr] items-center gap-2 border-b border-slate-100 px-4 py-3.5 text-left text-sm',
                    active && 'is-active',
                  )}
                >
                  <div>
                    <div className="font-semibold text-[#0f172a]">
                      {item.label}
                      {item.element && (
                        <span className="ml-2 text-[10px] font-bold tracking-wide text-[#94a3b8] uppercase">
                          {item.phase}
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      value={item.onsitePercent}
                      planned={item.plannedPercent}
                      status={item.status}
                      className="mt-1.5"
                      showLabel={false}
                    />
                  </div>
                  <div className="text-xs font-medium text-[#64748b]">{item.plannedDays}</div>
                  <div className="font-display text-base font-extrabold text-[#0f172a]">
                    {item.onsitePercent}%
                  </div>
                  <div>
                    <StatusBadge status={item.status} compact />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="thumb-box">
                      <ImageIcon className="size-3.5" />
                    </div>
                    <span className="truncate text-[10px] font-medium text-[#64748b]">
                      {item.imageLabel ?? '—'}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'text-xs leading-snug',
                      item.status === 'behind' ? 'font-medium text-red-600' : 'text-[#64748b]',
                    )}
                  >
                    {item.status === 'behind'
                      ? item.remark?.trim() || 'Behind schedule — check forecast'
                      : item.remark ?? '—'}
                  </div>
                </motion.button>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </Panel>
  )
}

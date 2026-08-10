import { motion } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'

export function ForecastPanel() {
  const forecasts = useAppStore((s) => s.forecasts)
  const zones = useAppStore((s) => s.zones)
  const selectZone = useAppStore((s) => s.selectZone)
  const whatIfActive = useAppStore((s) => s.whatIfActive)
  const setComparisonMode = useAppStore((s) => s.setComparisonMode)
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab)
  const setPulseCriticalPath = useAppStore((s) => s.setPulseCriticalPath)

  return (
    <Panel
      title="Delay Forecast"
      accent="coral"
      action={<span className="text-[10px] font-semibold text-[#94a3b8]">Critical-path aware</span>}
      className="h-full"
      bodyClassName="scrollbar-thin space-y-2.5 overflow-auto p-3"
    >
      {forecasts.map((f, i) => {
        const zone = zones.find((z) => z.id === f.zoneId)
        const slip = whatIfActive && f.zoneId === 'zone_a' ? Math.max(0, f.slipDays - 3) : f.slipDays
        const prob = whatIfActive && f.zoneId === 'zone_a' ? Math.max(20, f.probability - 18) : f.probability
        return (
          <motion.button
            key={f.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn('forecast-card text-left', f.criticalPath && 'forecast-card--critical')}
            onClick={() => {
              void selectZone(f.zoneId)
              if (f.zoneId === 'zone_e') {
                setComparisonMode('dem')
                setWorkspaceTab('survey')
              } else {
                setWorkspaceTab('progress')
              }
              setPulseCriticalPath(true)
              window.setTimeout(() => setPulseCriticalPath(false), 2800)
            }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div>
                <div className="font-display text-sm font-bold text-[#0f172a]">
                  {zone ? `Zone ${zone.code}` : 'Zone'} · {f.phase}
                </div>
                <div className="text-[11px] text-[#64748b]">{f.impact}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-extrabold text-rose-600">{slip}d</div>
                <div className="text-[10px] font-semibold text-[#94a3b8]">{f.slipRange}</div>
              </div>
            </div>

            <div className="mb-2 flex h-8 items-end gap-0.5">
              {f.trend.map((v, ti) => (
                <motion.span
                  key={ti}
                  className="flex-1 rounded-t bg-gradient-to-t from-rose-400 to-amber-300"
                  initial={{ height: 4 }}
                  animate={{ height: `${12 + (whatIfActive && f.zoneId === 'zone_a' ? Math.max(0, v - 2) : v) * 3}px` }}
                  transition={{ delay: ti * 0.04 }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="font-semibold text-[#64748b]">P(slip) {prob}%</span>
              {f.criticalPath && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-600">
                  Critical path
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[#475569]">→ {f.recommendation}</p>
          </motion.button>
        )
      })}
    </Panel>
  )
}

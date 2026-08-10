import { motion } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'
import { AlertTriangle, CheckCircle2, Info, Siren, Sparkles } from 'lucide-react'

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  critical: Siren,
  success: CheckCircle2,
}

export function InsightsPanel() {
  const insights = useAppStore((s) => s.insights)
  const zones = useAppStore((s) => s.zones)
  const focusedInsightId = useAppStore((s) => s.focusedInsightId)
  const focusInsight = useAppStore((s) => s.focusInsight)
  const toggleWhatIf = useAppStore((s) => s.toggleWhatIf)
  const whatIfActive = useAppStore((s) => s.whatIfActive)

  return (
    <Panel
      title="Actionable Insights"
      accent="mint"
      action={<span className="text-[10px] font-semibold text-[#047857]">Click to focus workspace</span>}
      className="h-full"
      bodyClassName="scrollbar-thin space-y-3 overflow-auto p-3.5"
    >
      {insights.map((insight, i) => {
        const Icon = iconMap[insight.severity]
        const zone = zones.find((z) => z.id === insight.zoneId)
        const focused = focusedInsightId === insight.id
        return (
          <motion.article
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={cn('insight-card cursor-pointer', focused && 'insight-card--focused')}
            onClick={() => void focusInsight(insight)}
          >
            <div className="mb-2 flex items-start gap-2.5">
              <span className={cn('insight-icon shrink-0', `insight-icon--${insight.severity}`)}>
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold leading-snug text-[#0f172a]">
                  {insight.title}
                </h3>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#64748b]">
                  {insight.body}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {zone && (
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${zone.color}22`, color: zone.color }}
                >
                  Zone {zone.code}
                </span>
              )}
              {insight.id === 'i3' && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!whatIfActive) toggleWhatIf()
                    void focusInsight(insight)
                  }}
                >
                  <Sparkles className="size-3" /> Run what-if
                </button>
              )}
              {insight.action && (
                <span className="text-[10px] font-semibold leading-snug text-[#b45309]">
                  → {insight.action}
                </span>
              )}
            </div>
          </motion.article>
        )
      })}
    </Panel>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { missionFactor, scaleProgressForMission } from '@/shared/lib/missionScale'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { X, ScanSearch, CalendarDays } from 'lucide-react'
import { formatDate, cn } from '@/shared/lib/utils'

export function EvidenceDrawer() {
  const evidenceItemId = useAppStore((s) => s.evidenceItemId)
  const openEvidence = useAppStore((s) => s.openEvidence)
  const progress = useAppStore((s) => s.progress)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const setComparisonMode = useAppStore((s) => s.setComparisonMode)
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab)

  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaled = scaleProgressForMission(progress, factor)
  const item = scaled.find((p) => p.id === evidenceItemId)
  const zone = zones.find((z) => z.id === selectedZoneId)
  const mission = missions[activeMissionIndex]

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.button
            type="button"
            aria-label="Close evidence"
            className="evidence-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => openEvidence(null)}
          />
          <motion.aside
            className="evidence-drawer"
            initial={{ x: '110%' }}
            animate={{ x: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="badge mb-2">Evidence pack</div>
                <h3 className="font-display text-lg font-extrabold text-[#0f172a]">
                  {item.label}
                </h3>
                <p className="mt-0.5 text-xs text-[#64748b]">
                  {zone?.name} · {item.phase}
                  {item.element ? ` / ${item.element}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
                onClick={() => openEvidence(null)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="evidence-shot">
                <div className="evidence-shot__grid" />
                <div className="evidence-shot__label">
                  <ScanSearch className="size-3.5" />
                  {item.imageLabel ?? 'Capture'} · {mission?.label}
                </div>
                <div className="absolute inset-x-6 bottom-10 top-10 rounded-lg border-2 border-dashed border-sky-400/50 bg-sky-400/10" />
                <div className="absolute right-4 bottom-4 rounded bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white">
                  AI measure {item.onsitePercent}%
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} compact />
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-[#64748b]">
                  <CalendarDays className="size-3" />
                  Updated {formatDate(item.lastUpdated)}
                </span>
              </div>

              <ProgressBar
                value={item.onsitePercent}
                planned={item.plannedPercent}
                color={zone?.color}
              />

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-bold tracking-[0.12em] text-[#94a3b8] uppercase">
                  Measurement source
                </div>
                <p className="mt-1 text-sm font-semibold text-[#0f172a]">
                  {item.measuredBy ?? 'Manual GC log'}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                  {item.evidenceNote ?? item.remark ?? 'No additional evidence notes for this phase.'}
                </p>
              </div>

              {(item.remark || item.status === 'behind') && (
                <div
                  className={cn(
                    'rounded-xl border p-3 text-xs',
                    item.status === 'behind'
                      ? 'border-red-200 bg-red-50/80 text-red-900'
                      : 'border-amber-200 bg-amber-50/80 text-amber-900',
                  )}
                >
                  <strong>Remark:</strong>{' '}
                  {item.remark?.trim() || 'Behind schedule — check forecast'}
                </div>
              )}

              <button
                type="button"
                className="primary-action w-full"
                onClick={() => {
                  if (item.element) {
                    setWorkspaceTab('progress')
                  } else {
                    setComparisonMode('ortho')
                    setWorkspaceTab('survey')
                  }
                  openEvidence(null)
                }}
              >
                {item.element ? 'Open floor-wise progress' : 'Open related comparison'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

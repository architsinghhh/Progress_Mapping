import { AnimatePresence, motion } from 'framer-motion'
import { Printer, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { formatDate, statusLabel, cn } from '@/shared/lib/utils'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'

export function ExecutiveSummaryModal() {
  const open = useAppStore((s) => s.summaryOpen)
  const setSummaryOpen = useAppStore((s) => s.setSummaryOpen)
  const project = useAppStore((s) => s.project)
  const zones = useAppStore((s) => s.zones)
  const insights = useAppStore((s) => s.insights)
  const forecasts = useAppStore((s) => s.forecasts)
  const volumes = useAppStore((s) => s.volumes)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const whatIfActive = useAppStore((s) => s.whatIfActive)

  const factor = missionFactor(activeMissionIndex, missions.length)
  const mission = missions[activeMissionIndex]
  const scaled = zones.map((z) => scaleZoneForMission(z, factor))
  const behind = scaled.filter((z) => z.scheduleStatus === 'behind')
  const critical = forecasts.filter((f) => f.criticalPath)
  const plannedCut = volumes.reduce((s, v) => s + v.cutM3, 0)
  const plannedFill = volumes.reduce((s, v) => s + v.fillM3, 0)
  const totalCut = volumes.reduce((s, v) => s + Math.round(v.cutM3 * factor), 0)
  const totalFill = volumes.reduce((s, v) => s + Math.round(v.fillM3 * factor), 0)
  const earthworkPct =
    plannedCut + plannedFill <= 0
      ? 0
      : Math.round(((totalCut + totalFill) / (plannedCut + plannedFill)) * 100)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close summary"
            className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSummaryOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-labelledby="exec-summary-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="exec-summary fixed inset-3 z-[80] mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-y-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 print:border-0">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                  Ajnhawk Progress Intelligence
                </p>
                <h2 id="exec-summary-title" className="font-display text-lg font-bold text-slate-900">
                  Executive Summary
                </h2>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  className="layer-chip inline-flex items-center gap-1.5"
                  onClick={() => window.print()}
                >
                  <Printer className="size-3.5" />
                  Print / PDF
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => setSummaryOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="scrollbar-thin flex-1 space-y-5 overflow-auto p-5 text-sm">
              <section>
                <h3 className="font-display text-base font-bold text-slate-900">{project?.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {project?.location} · {project?.totalAreaAcres} acres · Target{' '}
                  {project ? formatDate(project.targetDate) : '—'}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Snapshot as of <strong>{mission?.label}</strong> ({mission ? formatDate(mission.date) : '—'})
                  {whatIfActive ? ' · What-if scenario active' : ''}
                </p>
              </section>

              <section>
                <h4 className="mb-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                  Zone progress
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-400 uppercase">
                      <tr>
                        <th className="px-3 py-2">Zone</th>
                        <th className="px-3 py-2">Progress</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scaled.map((z) => (
                        <tr key={z.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {z.code} · {z.name}
                          </td>
                          <td className="px-3 py-2">{z.overallProgress}%</td>
                          <td className="px-3 py-2">{statusLabel(z.scheduleStatus)}</td>
                          <td
                            className={cn(
                              'px-3 py-2 text-[11px]',
                              z.scheduleStatus === 'behind' ? 'font-medium text-red-600' : 'text-slate-500',
                            )}
                          >
                            {z.scheduleStatus === 'behind'
                              ? z.remark?.trim() || 'Behind schedule — check forecast'
                              : z.remark ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <h4 className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    Behind schedule
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                    {behind.length === 0 && <li>All zones on schedule in this snapshot.</li>}
                    {behind.map((z) => (
                      <li key={z.id}>
                        <strong>
                          {z.code} {z.name}
                        </strong>{' '}
                        — {z.remark?.trim() || statusLabel(z.scheduleStatus)} ({z.overallProgress}%)
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <h4 className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    Cut–fill progress
                  </h4>
                  <p className="mt-2 text-xs text-slate-600">
                    Cut {totalCut.toLocaleString()} / {plannedCut.toLocaleString()} m³
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Fill {totalFill.toLocaleString()} / {plannedFill.toLocaleString()} m³
                  </p>
                  <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">
                    {earthworkPct}%
                    <span className="ml-1 text-xs font-semibold text-slate-400">of planned</span>
                  </p>
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                  Critical-path forecasts
                </h4>
                <ul className="space-y-2">
                  {(critical.length ? critical : forecasts.slice(0, 3)).map((f) => {
                    const z = zones.find((x) => x.id === f.zoneId)
                    return (
                      <li key={f.id} className="rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-2 text-xs">
                        <strong>
                          Zone {z?.code ?? '—'} · {f.phase}
                        </strong>{' '}
                        — {f.slipDays}d slip ({f.probability}%) · {f.impact}
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section>
                <h4 className="mb-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                  Top insights
                </h4>
                <ul className="space-y-2">
                  {insights.slice(0, 4).map((i) => (
                    <li key={i.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                      <strong className="text-slate-900">{i.title}</strong>
                      <p className="mt-1 text-slate-600">{i.body}</p>
                      {i.action && <p className="mt-1 font-semibold text-amber-800">→ {i.action}</p>}
                    </li>
                  ))}
                </ul>
              </section>

              <p className="text-[10px] text-slate-400">
                Demo pack generated from mock survey intelligence. Replace with live API / orthos when
                source data is available.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

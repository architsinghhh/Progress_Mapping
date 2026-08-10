import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import { buildFloorComparisons } from '@/shared/lib/floorProgress'

export function FloorWisePanel() {
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const selectZone = useAppStore((s) => s.selectZone)
  const selectedFloor = useAppStore((s) => s.selectedFloor)
  const setSelectedFloor = useAppStore((s) => s.setSelectedFloor)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)

  const zone = zones.find((z) => z.id === selectedZoneId)
  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaledZone = useMemo(
    () => (zone ? scaleZoneForMission(zone, factor) : undefined),
    [zone, factor],
  )
  const floors = useMemo(
    () => (scaledZone ? buildFloorComparisons(scaledZone) : []),
    [scaledZone],
  )

  const avg = useMemo(() => {
    if (floors.length === 0) return { actual: 0, column: 0, beam: 0, slab: 0, done: 0 }
    const n = floors.length
    return {
      actual: Math.round(floors.reduce((s, f) => s + f.actual, 0) / n),
      column: Math.round(floors.reduce((s, f) => s + f.elements.column, 0) / n),
      beam: Math.round(floors.reduce((s, f) => s + f.elements.beam, 0) / n),
      slab: Math.round(floors.reduce((s, f) => s + f.elements.slab, 0) / n),
      done: floors.filter((f) => f.actual >= 95).length,
    }
  }, [floors])

  const missionLabel = missions[activeMissionIndex]?.label ?? 'Current'

  return (
    <Panel
      title="Floor-wise progress"
      accent="indigo"
      action={
        <span className="text-[10px] font-semibold text-[#94a3b8]">
          {missionLabel} · per building
        </span>
      }
      className="h-full"
      bodyClassName="flex min-h-0 flex-1 flex-col gap-3 p-3"
    >
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {zones.map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => void selectZone(z.id)}
            className={cn(
              'rounded-md border px-2 py-1 text-[10px] font-bold tracking-wide uppercase transition',
              z.id === selectedZoneId
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
            )}
            style={z.id === selectedZoneId ? undefined : { borderLeftColor: z.color, borderLeftWidth: 3 }}
          >
            {z.code}
            <span className="ml-1 font-semibold normal-case text-inherit opacity-80">
              {z.floorsPlanned > 0 ? `G+${z.floorsPlanned}` : '—'}
            </span>
          </button>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-[#64748b]">
        <div>
          Element completion |{' '}
          <span className="font-semibold text-slate-700">{zone?.name ?? 'Zone'}</span>
          {scaledZone && scaledZone.floorsPlanned > 0 ? (
            <span className="text-slate-400">
              {' '}
              · {scaledZone.floorsComplete}/{scaledZone.floorsPlanned} floors closed
            </span>
          ) : null}
        </div>
        {floors.length > 0 ? (
          <div className="text-[11px] font-medium text-slate-500">
            {avg.done}/{floors.length} done · avg onsite {avg.actual}%
          </div>
        ) : null}
      </div>

      {floors.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500">
          {zone?.floorsPlanned === 0
            ? `${zone.name} has no floor plate (open space / grading only).`
            : 'Select a zone with vertical structure to see floor-wise progress.'}
        </div>
      ) : (
        <div className="scrollbar-thin grid min-h-0 flex-1 gap-3 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {floors.map((f) => {
            const focused = selectedFloor === f.floor
            return (
              <motion.button
                key={f.floor}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedFloor(focused ? null : f.floor)}
                className={cn(
                  'rounded-xl border border-slate-200 bg-white/90 p-3.5 text-left shadow-sm transition',
                  focused && 'border-sky-400 ring-2 ring-sky-200',
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-[#0f172a]">
                    Floor {f.floor}
                  </span>
                  <StatusBadge status={f.status} remark={f.remark} />
                </div>
                <ProgressBar
                  value={f.actual}
                  planned={f.planned}
                  status={f.status}
                  showLabel
                />
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-[10px] font-semibold text-[#64748b]">
                  <span>Col {f.elements.column}%</span>
                  <span>Beam {f.elements.beam}%</span>
                  <span>Slab {f.elements.slab}%</span>
                </div>
              </motion.button>
            )
          })}

          <div className="floor-summary sm:col-span-2 xl:col-span-1">
            <div className="floor-summary__title">Zone rollup</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="floor-summary__stat">
                <span>Floors done</span>
                <strong>
                  {avg.done}/{floors.length}
                </strong>
              </div>
              <div className="floor-summary__stat">
                <span>Avg onsite</span>
                <strong>{avg.actual}%</strong>
              </div>
              <div className="floor-summary__stat">
                <span>Columns</span>
                <strong>{avg.column}%</strong>
              </div>
              <div className="floor-summary__stat">
                <span>Beams / Slabs</span>
                <strong>
                  {avg.beam}% / {avg.slab}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}

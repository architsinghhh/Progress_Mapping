import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel } from '@/shared/ui/Panel'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import {
  buildWingFloorRows,
  buildWingProgressBars,
  buildWingsForZone,
  FLOOR_STAGE_FLOW,
} from '@/shared/lib/floorProgress'
import { floorRemarkKey, stageRemarkKey, zoneRemarkKey } from '@/shared/lib/workRemarks'
import { WorkRemarkField } from '@/shared/ui/WorkRemarkField'

type FloorFilter = 'working' | 'done' | 'all'

function floorDisplayName(floor: number) {
  if (floor === 1) return 'Ground Floor'
  const n = floor - 1
  if (n === 1) return '1st Floor'
  if (n === 2) return '2nd Floor'
  if (n === 3) return '3rd Floor'
  return `${n}th Floor`
}

function floorWorkState(actual: number): { label: string; tone: 'done' | 'active' | 'idle' } {
  if (actual >= 95) return { label: 'Done', tone: 'done' }
  if (actual > 0) return { label: 'In progress', tone: 'active' }
  return { label: 'Not started', tone: 'idle' }
}

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

  const wings = useMemo(
    () => (scaledZone ? buildWingsForZone(scaledZone) : []),
    [scaledZone],
  )
  const [wingId, setWingId] = useState<string | null>(null)
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('working')
  const tableWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWingId(wings[0]?.id ?? null)
    setSelectedFloor(null)
    setFloorFilter('working')
  }, [scaledZone?.id, wings, setSelectedFloor])

  const activeWingId = wingId && wings.some((w) => w.id === wingId) ? wingId : wings[0]?.id
  const activeWing = wings.find((w) => w.id === activeWingId)

  const floors = useMemo(
    () => (scaledZone && activeWingId ? buildWingFloorRows(scaledZone, activeWingId) : []),
    [scaledZone, activeWingId],
  )

  const wingBars = useMemo(
    () => (scaledZone ? buildWingProgressBars(scaledZone) : []),
    [scaledZone],
  )

  const doneCount = floors.filter((f) => f.actual >= 95).length
  const workingCount = floors.length - doneCount
  const activeFloorNo = floors.find((f) => f.actual > 0 && f.actual < 95)?.floor ?? null

  const visibleFloors = useMemo(() => {
    if (floorFilter === 'done') return floors.filter((f) => f.actual >= 95)
    if (floorFilter === 'working') {
      const open = floors.filter((f) => f.actual < 95)
      // If everything is closed, fall back to full list so the table isn't empty
      return open.length > 0 ? open : floors
    }
    return floors
  }, [floors, floorFilter])

  const selectedRow =
    visibleFloors.find((f) => f.floor === selectedFloor) ??
    floors.find((f) => f.floor === selectedFloor) ??
    visibleFloors.find((f) => f.actual < 100 && f.actual > 0) ??
    visibleFloors[0]

  const avg = useMemo(() => {
    if (floors.length === 0) return { actual: 0, done: 0 }
    return {
      actual: Math.round(floors.reduce((s, f) => s + f.actual, 0) / floors.length),
      done: doneCount,
    }
  }, [floors, doneCount])

  // Keep the active / selected floor in view inside the clipped table
  useEffect(() => {
    const wrap = tableWrapRef.current
    if (!wrap) return
    const targetFloor = selectedRow?.floor ?? activeFloorNo
    if (targetFloor == null) return
    const row = wrap.querySelector(`[data-floor="${targetFloor}"]`)
    if (row instanceof HTMLElement) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedRow?.floor, activeFloorNo, floorFilter, activeWingId])

  const missionLabel = missions[activeMissionIndex]?.label ?? 'Current'

  return (
    <Panel
      title="Floor-wise progress"
      accent="indigo"
      action={
        <span className="text-[10px] font-semibold text-[#94a3b8]">
          {missionLabel} · zone → wing → floor flow
        </span>
      }
      className="min-h-0"
      bodyClassName="flex min-h-0 flex-col gap-3 p-3"
    >
      {/* 1) Zones */}
      <div>
        <div className="floor-nav-label">1 · Zone</div>
        <div className="flex flex-wrap gap-1.5">
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => void selectZone(z.id)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-[10px] font-bold tracking-wide uppercase transition',
                z.id === selectedZoneId
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
              )}
              style={
                z.id === selectedZoneId
                  ? undefined
                  : { borderLeftColor: z.color, borderLeftWidth: 3 }
              }
            >
              {z.code} · {z.name}
              <span className="ml-1 font-semibold normal-case opacity-80">
                {z.floorsPlanned > 0 ? `G+${z.floorsPlanned}` : 'no floors'}
              </span>
            </button>
          ))}
        </div>
        {scaledZone ? (
          <div className="mt-2">
            <WorkRemarkField
              remarkKey={zoneRemarkKey(scaledZone.id)}
              fallback={scaledZone.remark}
              placeholder="Add zone remark…"
              compact
              tone={
                scaledZone.scheduleStatus === 'behind'
                  ? 'behind'
                  : scaledZone.scheduleStatus === 'ahead'
                    ? 'ahead'
                    : 'default'
              }
            />
          </div>
        ) : null}
      </div>

      {!scaledZone || scaledZone.floorsPlanned <= 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500">
          {zone?.floorsPlanned === 0
            ? `${zone.name} has no floor plate (open space / grading only).`
            : 'Select a zone with vertical structure.'}
        </div>
      ) : (
        <>
          {/* 2) Wings / blocks — full-width strip (no empty gap) */}
          <div className="floor-wing-board">
            <div className="floor-nav-label">2 · Wing / block</div>
            <div
              className="floor-wing-board__grid"
              style={{ ['--wing-n' as string]: Math.max(1, wings.length) }}
            >
              {wings.map((w) => {
                const bar = wingBars.find((b) => b.wingId === w.id)
                const pct = bar?.percent ?? 0
                const active = w.id === activeWingId
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setWingId(w.id)
                      setSelectedFloor(null)
                    }}
                    className={cn('floor-wing-tile', active && 'is-active')}
                  >
                    <div className="floor-wing-tile__top">
                      <span className="floor-wing-tile__name">{w.label}</span>
                      <span className="floor-wing-tile__pct">{pct}%</span>
                    </div>
                    <div className="floor-wing-tile__track" aria-hidden>
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    <span className="floor-wing-tile__meta">
                      {active ? 'Selected' : 'Tap to open floors'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3) Floor table + detail */}
          <div className="floor-detail-grid">
            <div className="floor-detail-grid__main">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="floor-nav-label">3 · Floors · {activeWing?.label ?? 'Wing'}</div>
                  <p className="text-[11px] text-slate-500">
                    {avg.done}/{floors.length} floors closed · avg {avg.actual}%
                  </p>
                </div>
                <div className="floor-table-filters" role="tablist" aria-label="Floor list filter">
                  {(
                    [
                      ['working', `Working (${workingCount})`],
                      ['done', `Done (${doneCount})`],
                      ['all', `All (${floors.length})`],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={floorFilter === id}
                      className={cn('floor-table-filter', floorFilter === id && 'is-active')}
                      onClick={() => setFloorFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {floorFilter === 'working' && doneCount > 0 && workingCount > 0 ? (
                <button
                  type="button"
                  className="floor-table-collapsed"
                  onClick={() => setFloorFilter('done')}
                >
                  {doneCount} floor{doneCount === 1 ? '' : 's'} completed — view done list
                </button>
              ) : null}

              <div ref={tableWrapRef} className="floor-table-wrap scrollbar-thin">
                <table className="floor-table">
                  <thead>
                    <tr>
                      <th scope="col">Floor</th>
                      <th scope="col">Current progress</th>
                      {FLOOR_STAGE_FLOW.map((s) => (
                        <th key={s.key} scope="col">
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFloors.map((f) => {
                      const focused = selectedRow?.floor === f.floor
                      const work = floorWorkState(f.actual)
                      return (
                        <tr
                          key={f.floor}
                          data-floor={f.floor}
                          className={cn(focused && 'is-focused')}
                          onClick={() => setSelectedFloor(focused ? null : f.floor)}
                        >
                          <td className="floor-table__floor">
                            <span className="floor-table__floor-name">{floorDisplayName(f.floor)}</span>
                            <span className="floor-table__floor-idx">F{f.floor}</span>
                          </td>
                          <td className="floor-table__progress">
                            <div className="floor-table__progress-row">
                              <span className={cn('floor-table__work', `is-${work.tone}`)}>
                                {work.label}
                              </span>
                              <strong className="floor-table__pct">{f.actual}%</strong>
                              <StatusBadge status={f.status} compact />
                            </div>
                            <div className="floor-table__bar" aria-hidden>
                              <i
                                style={{
                                  width: `${Math.min(100, f.actual)}%`,
                                  background:
                                    f.status === 'behind'
                                      ? 'var(--color-sched-behind)'
                                      : f.status === 'ahead'
                                        ? 'var(--color-sched-ahead)'
                                        : f.status === 'completed'
                                          ? 'var(--color-sched-completed)'
                                          : 'var(--color-sched-on-track)',
                                }}
                              />
                            </div>
                          </td>
                          {FLOOR_STAGE_FLOW.map((col) => {
                            const stage = f.stages.find((s) => s.key === col.key)
                            const pct = stage?.percent ?? 0
                            const st = stage?.status ?? 'pending'
                            return (
                              <td key={col.key} className="floor-table__stage">
                                <span className={cn('floor-table__stage-pct', `is-${st}`)}>
                                  {pct}%
                                </span>
                                <span className={cn('floor-table__stage-state', `is-${st}`)}>
                                  {st === 'done' ? 'Done' : st === 'active' ? 'In prog.' : '—'}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="floor-flow-card scrollbar-thin">
              <div className="floor-nav-label">
                {selectedRow ? floorDisplayName(selectedRow.floor) : 'Floor'} · remarks
              </div>

              {selectedRow && scaledZone && activeWingId ? (
                <>
                  <WorkRemarkField
                    remarkKey={floorRemarkKey(scaledZone.id, activeWingId, selectedRow.floor)}
                    fallback={selectedRow.remark}
                    placeholder="Add floor remark…"
                    className="mb-3"
                    tone={
                      selectedRow.status === 'behind'
                        ? 'behind'
                        : selectedRow.status === 'ahead'
                          ? 'ahead'
                          : 'default'
                    }
                  />
                  <ol className="floor-flow-list">
                    {selectedRow.stages.map((s, i) => (
                      <li key={s.key} className={cn('floor-flow-step', `is-${s.status}`)}>
                        <span className="floor-flow-step__idx">{String(i + 1).padStart(2, '0')}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <strong>{s.label}</strong>
                            <em>
                              {s.status === 'done'
                                ? 'Done'
                                : s.status === 'active'
                                  ? 'In progress'
                                  : 'Not started'}
                            </em>
                          </div>
                          <div className="floor-flow-step__track">
                            <i style={{ width: `${s.percent}%` }} />
                          </div>
                          <span className="floor-flow-step__pct">{s.percent}%</span>
                          <div className="mt-1.5">
                            <WorkRemarkField
                              remarkKey={stageRemarkKey(
                                scaledZone.id,
                                activeWingId,
                                selectedRow.floor,
                                s.key,
                              )}
                              placeholder={`Remark · ${s.label}`}
                              compact
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="text-sm text-slate-500">Select a floor row to review remarks.</p>
              )}
            </div>
          </div>
        </>
      )}
    </Panel>
  )
}

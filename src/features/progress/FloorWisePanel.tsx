import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel } from '@/shared/ui/Panel'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useAppStore } from '@/store/appStore'
import { cn, statusLabel } from '@/shared/lib/utils'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import {
  buildWingFloorRows,
  buildWingProgressBars,
  buildWingsForZone,
  FLOOR_STAGE_FLOW,
} from '@/shared/lib/floorProgress'
import { floorRemarkKey, stageRemarkKey, zoneRemarkKey } from '@/shared/lib/workRemarks'
import { WorkRemarkField } from '@/shared/ui/WorkRemarkField'
import {
  packageForZone,
  villasForZone,
  type ParsedVillaRow,
} from '@/services/excel/parseSiteWorkbook'
import type { ScheduleStatus } from '@/entities/types'

type FloorFilter = 'working' | 'done' | 'all'
type VillaFilter = 'delayed' | 'active' | 'all'

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

function villaScheduleStatus(v: ParsedVillaRow): ScheduleStatus {
  const s = v.status.toLowerCase()
  if (s.includes('not started') || (v.actualPct === 0 && !s.includes('delay'))) return 'not_started'
  if (s.includes('complete') || v.actualPct >= 95) return 'completed'
  if (s.includes('delay')) return 'behind'
  if (s.includes('progress')) return v.actualPct < 40 ? 'behind' : 'on_track'
  if (v.actualPct < 35) return 'behind'
  return 'on_track'
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Match Sheet2 display: 15-Feb-25 */
function fmtDate(iso?: string) {
  if (!iso) return '—'
  const [ys, ms, ds] = iso.split('-')
  const y = Number(ys)
  const m = Number(ms)
  const d = Number(ds)
  if (!y || !m || !d) return iso
  return `${d}-${MONTHS_SHORT[m - 1]}-${String(y).slice(2)}`
}

function fmtMonths(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

function fmtPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return `${Math.round(n)}%`
}

export function FloorWisePanel() {
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const selectZone = useAppStore((s) => s.selectZone)
  const selectedFloor = useAppStore((s) => s.selectedFloor)
  const setSelectedFloor = useAppStore((s) => s.setSelectedFloor)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const excelVillas = useAppStore((s) => s.excelVillas)
  const excelPackages = useAppStore((s) => s.excelPackages)

  const zone = zones.find((z) => z.id === selectedZoneId)
  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaledZone = useMemo(
    () => (zone ? scaleZoneForMission(zone, factor) : undefined),
    [zone, factor],
  )

  const zoneVillas = useMemo(
    () => (zone ? villasForZone(zone.name, excelVillas) : []),
    [zone, excelVillas],
  )
  const zonePackage = useMemo(
    () => (zone ? packageForZone(zone.name, excelPackages) : undefined),
    [zone, excelPackages],
  )
  const villaMode = zoneVillas.length > 0
  const packageMode = !villaMode && Boolean(zonePackage?.tasks.length)

  const wings = useMemo(
    () => (scaledZone && !villaMode ? buildWingsForZone(scaledZone) : []),
    [scaledZone, villaMode],
  )
  const [wingId, setWingId] = useState<string | null>(null)
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('working')
  const [villaFilter, setVillaFilter] = useState<VillaFilter>('all')
  const [selectedWing, setSelectedWing] = useState<string | null>(null)
  const tableWrapRef = useRef<HTMLDivElement>(null)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
    setWingId(wings[0]?.id ?? null)
    setSelectedFloor(null)
    setFloorFilter('working')
    setVillaFilter('all')
    setSelectedWing(null)
    setSelectedTaskId(null)
  }, [scaledZone?.id, wings, setSelectedFloor])

  const activeWingId = wingId && wings.some((w) => w.id === wingId) ? wingId : wings[0]?.id
  const activeWing = wings.find((w) => w.id === activeWingId)

  const floors = useMemo(
    () =>
      scaledZone && activeWingId && !villaMode ? buildWingFloorRows(scaledZone, activeWingId) : [],
    [scaledZone, activeWingId, villaMode],
  )

  const wingBars = useMemo(
    () => (scaledZone && !villaMode ? buildWingProgressBars(scaledZone) : []),
    [scaledZone, villaMode],
  )

  const doneCount = floors.filter((f) => f.actual >= 95).length
  const workingCount = floors.length - doneCount
  const activeFloorNo = floors.find((f) => f.actual > 0 && f.actual < 95)?.floor ?? null

  const visibleFloors = useMemo(() => {
    if (floorFilter === 'done') return floors.filter((f) => f.actual >= 95)
    if (floorFilter === 'working') {
      const open = floors.filter((f) => f.actual < 95)
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

  const sortedVillas = useMemo(() => {
    const list = [...zoneVillas]
    list.sort((a, b) => b.actualPct - a.actualPct)
    return list
  }, [zoneVillas])

  const visibleVillas = useMemo(() => {
    if (villaFilter === 'delayed') return sortedVillas.filter((v) => /delay/i.test(v.status))
    if (villaFilter === 'active') {
      return sortedVillas.filter(
        (v) => v.actualPct > 0 && v.actualPct < 95 && !/not\s*started/i.test(v.status),
      )
    }
    return sortedVillas
  }, [sortedVillas, villaFilter])

  const selectedVilla =
    visibleVillas.find((v) => v.wing === selectedWing) ??
    sortedVillas.find((v) => v.wing === selectedWing) ??
    visibleVillas[0] ??
    null

  const villaStats = useMemo(() => {
    const delayed = zoneVillas.filter((v) => /delay/i.test(v.status)).length
    const notStarted = zoneVillas.filter((v) => /not\s*started/i.test(v.status)).length
    const avgPct = zoneVillas.length
      ? Math.round(zoneVillas.reduce((s, v) => s + v.actualPct, 0) / zoneVillas.length)
      : 0
    return { delayed, notStarted, avgPct, total: zoneVillas.length }
  }, [zoneVillas])

  useEffect(() => {
    const wrap = tableWrapRef.current
    if (!wrap) return
    if (villaMode) {
      if (!selectedVilla) return
      const row = wrap.querySelector(`[data-villa="${CSS.escape(selectedVilla.wing)}"]`)
      if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      return
    }
    const targetFloor = selectedRow?.floor ?? activeFloorNo
    if (targetFloor == null) return
    const row = wrap.querySelector(`[data-floor="${targetFloor}"]`)
    if (row instanceof HTMLElement) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedRow?.floor, activeFloorNo, floorFilter, activeWingId, villaMode, selectedVilla?.wing])

  const missionLabel = missions[activeMissionIndex]?.label ?? 'Current'
  const selectedTask =
    zonePackage?.tasks.find((t) => t.id === selectedTaskId) ?? zonePackage?.tasks[0] ?? null

  return (
    <Panel
      title={
        villaMode
          ? 'Villa-wise progress'
          : packageMode
            ? 'Package progress'
            : 'Floor-wise progress'
      }
      accent="indigo"
      action={
        <span className="text-[10px] font-semibold text-[#94a3b8]">
          {villaMode
            ? `${missionLabel} · Excel Sheet2 villas`
            : packageMode
              ? `${missionLabel} · Excel Sheet1 package`
              : `${missionLabel} · zone → wing → floor flow`}
        </span>
      }
      className="min-h-0"
      bodyClassName="flex min-h-0 flex-col gap-3 p-3"
    >
      {/* 1) Zones */}
      <div>
        <div className="floor-nav-label">1 · Zone</div>
        <div className="flex flex-wrap gap-1.5">
          {zones.map((z) => {
            const villaN = villasForZone(z.name, excelVillas).length
            const pkg = packageForZone(z.name, excelPackages)
            return (
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
                {villaN
                  ? `${villaN} villas`
                  : pkg
                    ? `${pkg.actualPct}%`
                    : z.floorsPlanned > 0
                      ? `G+${z.floorsPlanned}`
                      : 'package'}
              </span>
            </button>
            )
          })}
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

      {villaMode && scaledZone ? (
        <div className="floor-detail-grid">
          <div className="floor-detail-grid__main">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="floor-nav-label">2 · Villas · {scaledZone.name}</div>
                <p className="text-[11px] text-slate-500">
                  {villaStats.total} villas · avg {villaStats.avgPct}% · {villaStats.delayed} delayed ·{' '}
                  {villaStats.notStarted} not started
                </p>
              </div>
              <div className="floor-table-filters" role="tablist" aria-label="Villa list filter">
                {(
                  [
                    ['all', `All (${villaStats.total})`],
                    ['delayed', `Delayed (${villaStats.delayed})`],
                    ['active', 'In progress'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={villaFilter === id}
                    className={cn('floor-table-filter', villaFilter === id && 'is-active')}
                    onClick={() => setVillaFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={tableWrapRef} className="floor-table-wrap scrollbar-thin">
              <table className="floor-table">
                <thead>
                  <tr>
                    <th scope="col">Villa</th>
                    <th scope="col">Work % (C / A)</th>
                    <th scope="col">Status</th>
                    <th scope="col">Start (C → A)</th>
                    <th scope="col">Possession (C → A)</th>
                    <th scope="col">Actual time (mo)</th>
                    <th scope="col">Time to delivery (mo)</th>
                    <th scope="col">Delayed %</th>
                    <th scope="col">Delayed (mo)</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVillas.map((v) => {
                    const focused = selectedVilla?.wing === v.wing
                    const st = villaScheduleStatus(v)
                    const work = floorWorkState(v.actualPct)
                    return (
                      <tr
                        key={v.wing}
                        data-villa={v.wing}
                        className={cn(focused && 'is-focused')}
                        onClick={() => setSelectedWing(focused ? null : v.wing)}
                      >
                        <td className="floor-table__floor">
                          <span className="floor-table__floor-name">{v.wing}</span>
                          <span className="floor-table__floor-idx">{v.section}</span>
                        </td>
                        <td className="floor-table__progress">
                          <div className="floor-table__progress-row">
                            <span className={cn('floor-table__work', `is-${work.tone}`)}>
                              {work.label}
                            </span>
                            <strong className="floor-table__pct">
                              {fmtPct(v.committedPct)} / {v.actualPct}%
                            </strong>
                          </div>
                          <div className="floor-table__bar" aria-hidden>
                            <i
                              style={{
                                width: `${Math.min(100, v.actualPct)}%`,
                                background:
                                  st === 'behind'
                                    ? 'var(--color-sched-behind)'
                                    : st === 'completed'
                                      ? 'var(--color-sched-completed)'
                                      : st === 'not_started'
                                        ? '#94a3b8'
                                        : 'var(--color-sched-on-track)',
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={st} compact />
                          <div className="mt-0.5 text-[10px] text-slate-500">{v.status}</div>
                        </td>
                        <td className="text-[11px] text-slate-600">
                          {fmtDate(v.startCommitted)}
                          <span className="text-slate-400"> → </span>
                          {fmtDate(v.startActual)}
                        </td>
                        <td className="text-[11px] text-slate-600">
                          {fmtDate(v.possessionCommitted)}
                          <span className="text-slate-400"> → </span>
                          {fmtDate(v.possessionActual)}
                        </td>
                        <td className="text-[11px] tabular-nums text-slate-700">
                          {fmtMonths(v.actualTimeToDeliveryMonths)}
                        </td>
                        <td className="text-[11px] tabular-nums text-slate-700">
                          {fmtMonths(v.timeToDeliveryMonths)}
                        </td>
                        <td className="text-[11px] tabular-nums font-semibold text-slate-700">
                          {fmtPct(v.delayedPct)}
                        </td>
                        <td className="text-[11px] tabular-nums font-semibold text-slate-700">
                          {fmtMonths(v.delayMonths)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="floor-flow-card scrollbar-thin">
            <div className="floor-nav-label">
              {selectedVilla ? `Villa ${selectedVilla.wing}` : 'Villa'} · detail
            </div>
            {selectedVilla ? (
              <div className="space-y-3 text-[12px] text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-slate-800">{selectedVilla.wing}</strong>
                  <span className="font-display text-lg font-extrabold text-slate-900">
                    {selectedVilla.actualPct}%
                  </span>
                </div>
                <p>
                  Status:{' '}
                  <span className="font-semibold">{selectedVilla.status}</span>
                  <span className="ml-2 text-slate-400">
                    ({statusLabel(villaScheduleStatus(selectedVilla))})
                  </span>
                </p>
                <p>
                  Overall work %: {fmtPct(selectedVilla.committedPct)} committed →{' '}
                  {selectedVilla.actualPct}% actual
                </p>
                <p>
                  Start: {fmtDate(selectedVilla.startCommitted)} committed →{' '}
                  {fmtDate(selectedVilla.startActual)} actual
                </p>
                <p>
                  Possession: {fmtDate(selectedVilla.possessionCommitted)} committed →{' '}
                  {fmtDate(selectedVilla.possessionActual)} actual
                </p>
                <p>
                  Actual time to delivery:{' '}
                  <strong>{fmtMonths(selectedVilla.actualTimeToDeliveryMonths)}</strong> mo
                </p>
                <p>
                  Time to delivery:{' '}
                  <strong>{fmtMonths(selectedVilla.timeToDeliveryMonths)}</strong> mo
                </p>
                <p>
                  Delayed %: <strong>{fmtPct(selectedVilla.delayedPct)}</strong>
                  {selectedVilla.delayMonths != null ? (
                    <>
                      {' '}
                      · Delayed in months:{' '}
                      <strong className="text-rose-700">
                        {fmtMonths(selectedVilla.delayMonths)}
                      </strong>
                    </>
                  ) : null}
                </p>
                <WorkRemarkField
                  remarkKey={`villa:${scaledZone.id}:${selectedVilla.wing}`}
                  fallback={undefined}
                  placeholder={`Remark · ${selectedVilla.wing}`}
                  tone={villaScheduleStatus(selectedVilla) === 'behind' ? 'behind' : 'default'}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a villa row for dates and remarks.</p>
            )}
          </div>
        </div>
      ) : packageMode && scaledZone && zonePackage ? (
        <div className="floor-detail-grid">
          <div className="floor-detail-grid__main">
            <div className="mb-2">
              <div className="floor-nav-label">2 · Tasks · {scaledZone.name}</div>
              <p className="text-[11px] text-slate-500">
                Sheet1 · overall {Math.round(zonePackage.actualPct)}% · {zonePackage.tasks.length}{' '}
                tasks
              </p>
            </div>
            <div ref={tableWrapRef} className="floor-table-wrap scrollbar-thin">
              <table className="floor-table">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col">Progress</th>
                    <th scope="col">Start</th>
                    <th scope="col">End</th>
                    <th scope="col">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {zonePackage.tasks.map((t) => {
                    const focused = selectedTask?.id === t.id
                    const work = floorWorkState(t.actualPct)
                    const st =
                      t.actualPct <= 0
                        ? ('not_started' as const)
                        : t.actualPct >= 95
                          ? ('completed' as const)
                          : ('on_track' as const)
                    return (
                      <tr
                        key={t.id}
                        className={cn(focused && 'is-focused')}
                        onClick={() => setSelectedTaskId(t.id)}
                      >
                        <td className="floor-table__floor">
                          <span className="floor-table__floor-name">{t.label}</span>
                          <span className="floor-table__floor-idx">{t.id}</span>
                        </td>
                        <td className="floor-table__progress">
                          <div className="floor-table__progress-row">
                            <span className={cn('floor-table__work', `is-${work.tone}`)}>
                              {work.label}
                            </span>
                            <strong className="floor-table__pct">{t.actualPct}%</strong>
                            <StatusBadge status={st} compact />
                          </div>
                          <div className="floor-table__bar" aria-hidden>
                            <i
                              style={{
                                width: `${Math.min(100, t.actualPct)}%`,
                                background:
                                  st === 'not_started'
                                    ? '#94a3b8'
                                    : st === 'completed'
                                      ? 'var(--color-sched-completed)'
                                      : 'var(--color-sched-on-track)',
                              }}
                            />
                          </div>
                        </td>
                        <td className="text-[11px] text-slate-600">{fmtDate(t.start)}</td>
                        <td className="text-[11px] text-slate-600">{fmtDate(t.end)}</td>
                        <td className="text-[11px] text-slate-600">
                          {t.durationDays != null ? `${Math.round(t.durationDays)} d` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="floor-flow-card scrollbar-thin">
            <div className="floor-nav-label">
              {selectedTask ? selectedTask.label : 'Task'} · detail
            </div>
            {selectedTask ? (
              <div className="space-y-3 text-[12px] text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-slate-800">
                    {selectedTask.id} · {selectedTask.label}
                  </strong>
                  <span className="font-display text-lg font-extrabold text-slate-900">
                    {selectedTask.actualPct}%
                  </span>
                </div>
                <p>
                  Start {fmtDate(selectedTask.start)} · End {fmtDate(selectedTask.end)}
                </p>
                <WorkRemarkField
                  remarkKey={`pkg:${scaledZone.id}:${selectedTask.id}`}
                  placeholder={`Remark · ${selectedTask.label}`}
                  compact
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a task row.</p>
            )}
          </div>
        </div>
      ) : !scaledZone || scaledZone.floorsPlanned <= 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500">
          {zone ? (
            <>
              <p className="font-semibold text-slate-700">{zone.name}</p>
              <p className="mt-1 max-w-md text-[12px] leading-relaxed">
                {zone.overallProgress > 0
                  ? `Sheet1 overall ${zone.overallProgress}% — no task breakdown in the workbook.`
                  : 'No villa or Sheet1 package rows for this zone yet.'}
              </p>
            </>
          ) : (
            'Select a zone.'
          )}
        </div>
      ) : (
        <>
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

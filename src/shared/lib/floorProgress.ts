import type { FloorComparison, ScheduleStatus, Zone } from '@/entities/types'

/** Standard vertical-structure work sequence on a floor plate. */
export type FloorStageKey = 'plinth' | 'column' | 'beam' | 'slab' | 'finishing'

export const FLOOR_STAGE_FLOW: { key: FloorStageKey; label: string }[] = [
  { key: 'plinth', label: 'Plinth' },
  { key: 'column', label: 'Columns' },
  { key: 'beam', label: 'Beams' },
  { key: 'slab', label: 'Slab' },
  { key: 'finishing', label: 'Finishing' },
]

export type WingBlock = {
  id: string
  label: string
  short: string
  /** Share of zone floors attributed to this wing (for demo split). */
  weight: number
}

export type FloorStageProgress = {
  key: FloorStageKey
  label: string
  percent: number
  status: 'done' | 'active' | 'pending'
}

export type WingFloorRow = FloorComparison & {
  stages: FloorStageProgress[]
  activeStage?: FloorStageKey
}

/**
 * Derive wings / blocks for a zone. Open-space / grading zones return [].
 */
export function buildWingsForZone(zone: Zone): WingBlock[] {
  if (zone.floorsPlanned <= 0) return []

  const name = zone.name.toLowerCase()
  const type = zone.type.toLowerCase()

  if (name.includes('residential') || type.includes('g+15') || type.includes('residential')) {
    return [
      { id: `${zone.id}_wa`, label: 'Wing A', short: 'A', weight: 0.38 },
      { id: `${zone.id}_wb`, label: 'Wing B', short: 'B', weight: 0.34 },
      { id: `${zone.id}_wc`, label: 'Wing C', short: 'C', weight: 0.28 },
    ]
  }
  if (name.includes('commercial') || type.includes('retail') || type.includes('commercial')) {
    return [
      { id: `${zone.id}_be`, label: 'Block East', short: 'E', weight: 0.55 },
      { id: `${zone.id}_bw`, label: 'Block West', short: 'W', weight: 0.45 },
    ]
  }
  if (name.includes('club') || type.includes('club')) {
    return [{ id: `${zone.id}_main`, label: 'Main block', short: 'M', weight: 1 }]
  }
  if (name.includes('amenities') || type.includes('amenities') || type.includes('shared')) {
    return [
      { id: `${zone.id}_pl`, label: 'Plaza block', short: 'P', weight: 0.6 },
      { id: `${zone.id}_sv`, label: 'Services block', short: 'S', weight: 0.4 },
    ]
  }
  return [{ id: `${zone.id}_main`, label: 'Main block', short: 'M', weight: 1 }]
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function stageStatus(pct: number): FloorStageProgress['status'] {
  if (pct >= 98) return 'done'
  if (pct > 0) return 'active'
  return 'pending'
}

function buildStages(actual: number, active: boolean, isGround: boolean): FloorStageProgress[] {
  // Standard lead: plinth (GF) → columns → beams → slab → finishing
  const column = actual
  const beam = actual === 0 ? 0 : Math.max(0, actual - (active ? 8 : 0))
  const slab = actual === 0 ? 0 : Math.max(0, actual - (active ? 18 : actual >= 100 ? 0 : 5))
  const plinth = isGround
    ? actual >= 100
      ? 100
      : actual > 0
        ? clampPct(Math.min(100, actual + 12))
        : 0
    : actual > 0
      ? 100
      : 0
  const finishing =
    actual >= 100 ? 100 : actual >= 85 ? clampPct(actual - 70) : actual >= 95 ? 40 : 0

  return FLOOR_STAGE_FLOW.map(({ key, label }) => {
    const percent =
      key === 'plinth'
        ? plinth
        : key === 'column'
          ? column
          : key === 'beam'
            ? beam
            : key === 'slab'
              ? slab
              : finishing
    return { key, label, percent: clampPct(percent), status: stageStatus(percent) }
  })
}

/**
 * Build floor-wise column/beam/slab progress from a zone's planned/complete floors.
 */
export function buildFloorComparisons(zone: Zone): FloorComparison[] {
  return buildWingFloorRows(zone, buildWingsForZone(zone)[0]?.id).map(
    ({ stages: _s, activeStage: _a, ...rest }) => rest,
  )
}

/** Floors for one wing — slight lag between wings for a believable split. */
export function buildWingFloorRows(zone: Zone, wingId?: string): WingFloorRow[] {
  const wings = buildWingsForZone(zone)
  const wing = wings.find((w) => w.id === wingId) ?? wings[0]
  const n = Math.max(0, Math.floor(zone.floorsPlanned))
  if (n === 0 || !wing) return []

  // Lag later wings a bit so progress differs across blocks
  const wingIndex = Math.max(0, wings.findIndex((w) => w.id === wing.id))
  const lagFloors = wingIndex === 0 ? 0 : wingIndex === 1 ? 1 : 2
  const complete = Math.max(
    0,
    Math.min(n, Math.floor(zone.floorsComplete) - lagFloors),
  )

  return Array.from({ length: n }, (_, i) => {
    const floor = i + 1
    const done = floor <= complete
    const active = floor === complete + 1 && complete < n

    let actual = 0
    if (done) actual = 100
    else if (active) {
      const raw = zone.overallProgress - complete * (100 / Math.max(n, 1))
      actual = Math.min(92, Math.max(18, Math.round(raw + 28 - wingIndex * 6)))
    }

    let planned = 0
    if (done || active) planned = 100
    else planned = Math.max(0, 100 - (floor - complete) * 18)

    let status: ScheduleStatus = 'on_track'
    let remark: string | undefined
    if (done) {
      status = 'completed'
    } else if (active) {
      if (zone.scheduleStatus === 'behind') {
        status = 'behind'
        remark =
          zone.remark?.trim() ||
          `${wing.label} · Floor ${floor} active — lagging zone plan`
      } else if (zone.scheduleStatus === 'ahead') {
        status = 'ahead'
        remark = `${wing.label} · Floor ${floor} active — ahead of planned cycle`
      } else {
        status = 'on_track'
        remark = `${wing.label} · Floor ${floor} active — work in progress on plan`
      }
    } else if (planned > 0 && actual === 0) {
      status = 'on_track'
      remark = `${wing.label} · Floor ${floor} queued — waiting on Floor ${complete + 1}`
    }

    const stages = buildStages(actual, active, floor === 1)
    const activeStage = stages.find((s) => s.status === 'active')?.key

    if (active && activeStage) {
      const stageLabel =
        FLOOR_STAGE_FLOW.find((s) => s.key === activeStage)?.label ?? activeStage
      if (status === 'behind') {
        remark =
          zone.remark?.trim() ||
          `${wing.label} · Floor ${floor} · ${stageLabel} lagging plan`
      } else if (status === 'ahead') {
        remark = `${wing.label} · Floor ${floor} · ${stageLabel} in progress — ahead of cycle`
      } else {
        remark = `${wing.label} · Floor ${floor} · ${stageLabel} in progress`
      }
    }

    return {
      floor,
      planned,
      actual,
      status,
      remark,
      elements: {
        column: stages.find((s) => s.key === 'column')?.percent ?? 0,
        beam: stages.find((s) => s.key === 'beam')?.percent ?? 0,
        slab: stages.find((s) => s.key === 'slab')?.percent ?? 0,
      },
      stages,
      activeStage,
    }
  })
}

/** Wing rollup % for bar chart (X = wing, Y = %). */
export function buildWingProgressBars(
  zone: Zone,
): { wingId: string; label: string; short: string; percent: number }[] {
  return buildWingsForZone(zone).map((w) => {
    const rows = buildWingFloorRows(zone, w.id)
    if (rows.length === 0) return { wingId: w.id, label: w.label, short: w.short, percent: 0 }
    const percent = Math.round(rows.reduce((s, r) => s + r.actual, 0) / rows.length)
    return { wingId: w.id, label: w.label, short: w.short, percent }
  })
}

import type { FloorComparison, ScheduleStatus, Zone } from '@/entities/types'

/**
 * Build floor-wise column/beam/slab progress from a zone's planned/complete floors.
 * Used by Progress tab and mock site bundles (not a single hardcoded tower list).
 */
export function buildFloorComparisons(zone: Zone): FloorComparison[] {
  const n = Math.max(0, Math.floor(zone.floorsPlanned))
  if (n === 0) return []

  const complete = Math.max(0, Math.min(n, Math.floor(zone.floorsComplete)))

  return Array.from({ length: n }, (_, i) => {
    const floor = i + 1
    const done = floor <= complete
    const active = floor === complete + 1 && complete < n

    let actual = 0
    if (done) actual = 100
    else if (active) {
      // In-progress floor: derive from zone overall, keep in a believable band
      const raw = zone.overallProgress - complete * (100 / Math.max(n, 1))
      actual = Math.min(92, Math.max(18, Math.round(raw + 28)))
    }

    let planned = 0
    if (done || active) planned = 100
    else planned = Math.max(0, 100 - (floor - complete) * 18)

    let status: ScheduleStatus = 'on_track'
    let remark: string | undefined
    if (done) status = 'completed'
    else if (active) {
      status = zone.scheduleStatus === 'behind' ? 'behind' : 'on_track'
      if (status === 'behind') {
        remark =
          zone.remark ??
          `Floor ${floor} active — ${zone.name} behind zone plan`
      }
    } else if (planned > 0 && actual === 0) {
      status = 'on_track'
    }

    // Element lag: columns lead, then beams, then slabs
    const column = actual
    const beam = actual === 0 ? 0 : Math.max(0, actual - (active ? 8 : 0))
    const slab = actual === 0 ? 0 : Math.max(0, actual - (active ? 18 : done ? 0 : 5))

    return {
      floor,
      planned,
      actual,
      status,
      remark,
      elements: { column, beam, slab },
    }
  })
}

import type { ProgressItem, ScheduleStatus, Zone } from '@/entities/types'

/** Mission scrub factor 0→1 across survey timeline */
export function missionFactor(index: number, total: number): number {
  if (total <= 1) return 1
  return Math.min(1, Math.max(0, index / (total - 1)))
}

/**
 * Derive schedule status from onsite vs plan:
 * ahead (>5 pts), on time (±5), behind (<-5), completed (≥98%).
 */
function deriveStatus(onsite: number, planned: number, base: ScheduleStatus): ScheduleStatus {
  if (base === 'not_started' && onsite <= 0) return 'not_started'
  if (onsite >= 98) return 'completed'
  // Finished jobs scrubbed back in time — never invent "behind"
  if (base === 'completed') {
    if (onsite >= 95) return 'completed'
    const delta = onsite - planned
    if (delta > 5) return 'ahead'
    return 'on_track'
  }
  if (base === 'behind') {
    const delta = onsite - planned
    // Recovery can lift behind → on time / ahead
    if (delta > 5) return 'ahead'
    if (delta >= -5) return 'on_track'
    return 'behind'
  }
  const delta = onsite - planned
  if (delta > 5) return 'ahead'
  if (delta >= -5) return onsite >= 95 ? 'completed' : onsite <= 0 ? 'not_started' : 'on_track'
  return 'behind'
}

/** Scale final progress rows back to a historical mission moment */
export function scaleProgressForMission(
  items: ProgressItem[],
  factor: number,
): ProgressItem[] {
  const ease = 0.12 + factor * 0.88
  return items.map((item) => {
    const onsite = Math.round(item.onsitePercent * ease)
    const planned = Math.round(item.plannedPercent * Math.min(1, ease + 0.08))
    const status = deriveStatus(onsite, planned, item.status)
    return {
      ...item,
      onsitePercent: Math.min(item.onsitePercent, onsite),
      plannedPercent: Math.min(100, planned),
      status,
      remark:
        status === 'behind'
          ? item.remark?.trim() || 'Lagging planned % at this survey'
          : item.remark,
    }
  })
}

export function scaleZoneForMission(zone: Zone, factor: number): Zone {
  const ease = 0.18 + factor * 0.82
  const overallProgress = Math.round(zone.overallProgress * ease)
  const floorsComplete = Math.max(
    0,
    Math.min(zone.floorsPlanned, Math.round(zone.floorsComplete * ease)),
  )

  // Expected plan curve for this scrub moment (slightly ahead of eased progress baseline)
  const plannedAtMission = Math.round(zone.overallProgress * Math.min(1, ease + 0.06))
  let scheduleStatus: ScheduleStatus = zone.scheduleStatus

  if (zone.scheduleStatus === 'not_started' && overallProgress <= 0) {
    scheduleStatus = 'not_started'
  } else if (overallProgress >= 98 && zone.scheduleStatus === 'completed') {
    scheduleStatus = 'completed'
  } else if (zone.scheduleStatus === 'completed' && overallProgress < 98) {
    const delta = overallProgress - plannedAtMission
    scheduleStatus = delta > 5 ? 'ahead' : 'on_track'
  } else if (zone.scheduleStatus === 'behind') {
    const delta = overallProgress - plannedAtMission
    if (factor < 0.25) scheduleStatus = 'on_track'
    else if (delta > 5) scheduleStatus = 'ahead'
    else if (delta >= -5) scheduleStatus = 'on_track'
    else scheduleStatus = 'behind'
  } else if (zone.scheduleStatus === 'ahead') {
    const delta = overallProgress - plannedAtMission
    if (overallProgress >= 98) scheduleStatus = 'completed'
    else if (delta > 5) scheduleStatus = 'ahead'
    else if (delta >= -5) scheduleStatus = 'on_track'
    else scheduleStatus = 'behind'
  } else {
    // on_track / not_started with some progress
    const delta = overallProgress - plannedAtMission
    if (overallProgress >= 98) scheduleStatus = 'completed'
    else if (overallProgress <= 0) scheduleStatus = 'not_started'
    else if (delta > 5) scheduleStatus = 'ahead'
    else if (delta >= -5) scheduleStatus = 'on_track'
    else scheduleStatus = 'behind'
  }

  return {
    ...zone,
    overallProgress,
    floorsComplete,
    scheduleStatus,
  }
}

export function terrainRiskLabel(type: string): string {
  switch (type) {
    case 'rocky':
      return 'Rock outcrop'
    case 'soft_soil':
      return 'Soft soil'
    case 'depression':
      return 'Depression'
    case 'high_elevation':
      return 'High elevation'
    default:
      return 'Stable ground'
  }
}

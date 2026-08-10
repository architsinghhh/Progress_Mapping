import type { ProgressItem, ScheduleStatus, Zone } from '@/entities/types'

/** Mission scrub factor 0→1 across survey timeline */
export function missionFactor(index: number, total: number): number {
  if (total <= 1) return 1
  return Math.min(1, Math.max(0, index / (total - 1)))
}

function deriveStatus(onsite: number, planned: number, base: ScheduleStatus): ScheduleStatus {
  if (onsite >= 98) return 'completed'
  const delta = onsite - planned
  if (delta >= -5) return onsite >= 95 ? 'completed' : 'on_track'
  if (base === 'behind' || delta < -5) return 'behind'
  return 'on_track'
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
  let scheduleStatus = zone.scheduleStatus
  if (zone.scheduleStatus === 'completed' && overallProgress >= 98) {
    scheduleStatus = 'completed'
  } else if (factor < 0.35) {
    scheduleStatus = 'on_track'
  } else if (zone.scheduleStatus === 'behind') {
    scheduleStatus = 'behind'
  } else if (zone.scheduleStatus === 'completed' && overallProgress < 98) {
    scheduleStatus = 'on_track'
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

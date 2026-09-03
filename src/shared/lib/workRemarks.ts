/** Persist site-team remarks keyed by project + work target (zone / floor / stage). */

export type WorkRemarkScope = 'zone' | 'floor' | 'stage'

export function zoneRemarkKey(zoneId: string) {
  return `zone:${zoneId}`
}

export function floorRemarkKey(zoneId: string, wingId: string, floor: number) {
  return `floor:${zoneId}:${wingId}:${floor}`
}

export function stageRemarkKey(
  zoneId: string,
  wingId: string,
  floor: number,
  stageKey: string,
) {
  return `stage:${zoneId}:${wingId}:${floor}:${stageKey}`
}

const storagePrefix = 'pm:work-remarks:'

export function loadWorkRemarks(projectId: string): Record<string, string> {
  if (typeof window === 'undefined' || !projectId) return {}
  try {
    const raw = window.localStorage.getItem(`${storagePrefix}${projectId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveWorkRemarks(projectId: string, remarks: Record<string, string>) {
  if (typeof window === 'undefined' || !projectId) return
  try {
    window.localStorage.setItem(`${storagePrefix}${projectId}`, JSON.stringify(remarks))
  } catch {
    /* ignore quota */
  }
}

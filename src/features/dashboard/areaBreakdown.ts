import type { Zone } from '@/entities/types'

export type AreaBreakdown = {
  overallPct: number
  completedPct: number
  inProgressPct: number
  notStartedPct: number
  totalAcres: number
  completedAcres: number
  inProgressAcres: number
  remainingAcres: number
}

/** Split site acres into completed / in-progress / not-started from zone progress. */
export function buildAreaBreakdown(zones: Zone[], totalAcres: number): AreaBreakdown {
  const n = Math.max(1, zones.length)
  const share = totalAcres / n
  let completedAcres = 0
  let inProgressAcres = 0
  let notStartedAcres = 0

  for (const z of zones) {
    const p = Math.min(100, Math.max(0, z.overallProgress))
    completedAcres += share * (p / 100)
    if (p <= 0) notStartedAcres += share
    else if (p < 100) inProgressAcres += share * ((100 - p) / 100)
  }

  const round1 = (v: number) => Math.round(v * 10) / 10
  completedAcres = round1(completedAcres)
  inProgressAcres = round1(inProgressAcres)
  notStartedAcres = round1(Math.max(0, totalAcres - completedAcres - inProgressAcres))

  const safeTotal = Math.max(totalAcres, 0.001)
  const completedPct = Math.round((completedAcres / safeTotal) * 100)
  const inProgressPct = Math.round((inProgressAcres / safeTotal) * 100)
  const notStartedPct = Math.max(0, 100 - completedPct - inProgressPct)
  const overallPct = Math.round(
    zones.length ? zones.reduce((s, z) => s + z.overallProgress, 0) / zones.length : 0,
  )

  return {
    overallPct,
    completedPct,
    inProgressPct,
    notStartedPct,
    totalAcres: round1(totalAcres),
    completedAcres,
    inProgressAcres,
    remainingAcres: notStartedAcres,
  }
}

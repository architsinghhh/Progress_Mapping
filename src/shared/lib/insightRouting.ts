import type { Insight } from '@/entities/types'

type WorkspaceTab = 'overview' | 'siteprep' | 'progress' | 'survey'

const SITE_PREP_PHASES = new Set([
  'excavation',
  'earthwork',
  'earthworks',
  'grading',
  'landscaping',
  'cut',
  'fill',
])

const CONSTRUCTION_PHASES = new Set([
  'plinth',
  'column',
  'beam',
  'slab',
  'superstructure',
  'finishing',
  'structure',
])

/**
 * Route an insight to the workspace that already shows its evidence.
 * Driven only by insight fields (mode / terrain / phase / zone) — not per-id hardcoding.
 */
export function resolveInsightWorkspaceTab(insight: Insight): WorkspaceTab {
  const mode = insight.comparisonMode
  const phase = insight.phaseKey?.trim().toLowerCase()

  if (mode === 'floor') return 'progress'
  if (mode === 'dem') return 'siteprep'
  if (mode === 'ortho') return 'survey'

  if (insight.terrainId) return 'siteprep'

  if (phase) {
    if (SITE_PREP_PHASES.has(phase)) return 'siteprep'
    if (CONSTRUCTION_PHASES.has(phase)) return 'progress'
  }

  // Zone-linked insight with no survey mode → zone detail (floor-wise / construction)
  if (insight.zoneId) return 'progress'

  if (insight.severity === 'critical') return 'siteprep'

  // Site-wide / informational with no deep link → Home
  return 'overview'
}

/** Whether Periodic Progress Monitoring should switch Ortho/DEM wipe mode. */
export function insightUsesSurveyCompare(insight: Insight): boolean {
  return (
    resolveInsightWorkspaceTab(insight) === 'survey' &&
    (insight.comparisonMode === 'ortho' || insight.comparisonMode === 'dem')
  )
}

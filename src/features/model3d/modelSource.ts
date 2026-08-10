export type ModelStageEntry = {
  id: string
  label: string
  subtitle?: string
  missionHint?: string
  /** Empty site / scratch baseline — no GLB required */
  blank?: boolean
  /** Extra yaw (deg) for ortho nadir capture — align roads across exports */
  orthoYawDeg?: number
  driveFileId?: string
  driveUrl?: string
  localPath?: string
  ready?: boolean
  notes?: string
}

export type ModelIndex = {
  project?: string
  defaultStageId?: string
  stages: ModelStageEntry[]
}

const SOURCE_VERSION = 'stages7-byname'

/** Proxy URL for a stage GLB (Vite streams from Drive / disk cache). */
export function driveModelUrlForStage(stageId: string): string {
  return `/api/drive-model?stage=${encodeURIComponent(stageId)}&v=${SOURCE_VERSION}`
}

export async function fetchModelIndex(): Promise<ModelIndex> {
  const res = await fetch(`/api/drive-model/index?v=${SOURCE_VERSION}`, { credentials: 'same-origin' })
  if (!res.ok) {
    // Fallback: static public copy (works even if plugin is down)
    const local = await fetch(`/models/model-index.json?v=${SOURCE_VERSION}`)
    if (!local.ok) throw new Error('Could not load model index')
    return (await local.json()) as ModelIndex
  }
  return (await res.json()) as ModelIndex
}

export function pickDefaultStage(index: ModelIndex): ModelStageEntry | null {
  const stages = index.stages ?? []
  return (
    stages.find((s) => s.id === index.defaultStageId && s.ready) ??
    stages.find((s) => s.ready) ??
    stages[stages.length - 1] ??
    null
  )
}

export const SITE_GLB_USES_DRIVE = true
export const SITE_GLB_SOURCE_LABEL = 'Cloud model stages'

/** @deprecated use driveModelUrlForStage — kept for SiteGlbModel preload of default */
export const SITE_GLB_URL = driveModelUrlForStage('final')

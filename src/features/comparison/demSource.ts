/**
 * Survey DEM stills under public/media/DEMs (Initial → Stage 6 / Final).
 */

const BY_STAGE_ID: Record<string, string> = {
  initial: '/media/DEMs/Initial.png',
  stage1: '/media/DEMs/Stage1.png',
  stage2: '/media/DEMs/Stage2.png',
  stage3: '/media/DEMs/Stage3.png',
  stage4: '/media/DEMs/Stage4.png',
  stage5: '/media/DEMs/Stage5.png',
  final: '/media/DEMs/Stage6.png',
}

/** Greenfield mission index → DEM still. */
const BY_MISSION_INDEX: (string | null)[] = [
  '/media/DEMs/Initial.png',
  '/media/DEMs/Stage1.png',
  '/media/DEMs/Stage2.png',
  '/media/DEMs/Stage3.png',
  '/media/DEMs/Stage4.png',
  '/media/DEMs/Stage5.png',
  '/media/DEMs/Stage6.png',
]

export function demUrlForStageId(stageId?: string | null): string | null {
  if (!stageId) return null
  return BY_STAGE_ID[stageId] ?? null
}

export function demUrlForMissionIndex(missionIndex: number): string | null {
  if (missionIndex < 0) return null
  return BY_MISSION_INDEX[missionIndex] ?? null
}

export function demUrlForMission(opts: {
  missionIndex: number
  modelStageId?: string | null
}): string | null {
  return demUrlForStageId(opts.modelStageId) ?? demUrlForMissionIndex(opts.missionIndex)
}

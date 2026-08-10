import type { ConstructionStageDef } from '@/entities/types'

/** Township Construction Monitoring Stages (doc §3–4) */
export const CONSTRUCTION_STAGES: ConstructionStageDef[] = [
  {
    id: 1,
    label: 'Site Preparation',
    shortLabel: 'Stage 1',
    primaryComponents: ['residential'],
    residentialMilestone: 'Barren land, site prep, floor-plan finalization',
    commercialMilestone: '—',
    amenityMilestone: '—',
    keyMilestone: 'Site mobilization',
    droneObjective:
      'Identify land-clearing and layout changes; confirm site-prep % vs planned start.',
    modelStageId: 'initial',
  },
  {
    id: 2,
    label: 'Foundation & Structural Base',
    shortLabel: 'Stage 2',
    primaryComponents: ['residential'],
    residentialMilestone: 'Foundation, columns, slabs, parking',
    commercialMilestone: '—',
    amenityMilestone: '—',
    keyMilestone: 'Structural base complete',
    droneObjective: 'Detect foundation/column progress; estimate structural-base completion.',
    modelStageId: 'stage1',
  },
  {
    id: 3,
    label: 'Residential Rise & Commercial Start',
    shortLabel: 'Stage 3',
    primaryComponents: ['residential', 'commercial'],
    residentialMilestone: 'G+3 floor completion',
    commercialMilestone: 'Initiation of construction',
    amenityMilestone: '—',
    keyMilestone: 'Commercial works begin',
    droneObjective: 'Track residential to G+3; detect commercial onset; flag lag in either.',
    modelStageId: 'stage2',
  },
  {
    id: 4,
    label: 'Residential Rise & Commercial Completion',
    shortLabel: 'Stage 4',
    primaryComponents: ['residential', 'commercial'],
    residentialMilestone: 'G+6 floor completion',
    commercialMilestone: 'Completion of construction',
    amenityMilestone: '—',
    keyMilestone: 'Commercial works complete',
    droneObjective: 'Confirm G+6 residential; verify commercial completion vs reference.',
    modelStageId: 'stage3',
  },
  {
    id: 5,
    label: 'Residential Rise & Amenity Initiation',
    shortLabel: 'Stage 5',
    primaryComponents: ['residential', 'open_spaces', 'amenities', 'club_house'],
    residentialMilestone: 'G+10 floor completion',
    commercialMilestone: '—',
    amenityMilestone: 'Open spaces, amenities & club house initiated',
    keyMilestone: 'Amenity works begin',
    droneObjective: 'Track residential to G+10; detect amenity / open-space / club initiation.',
    modelStageId: 'stage4',
  },
  {
    id: 6,
    label: 'Residential & Amenity Completion',
    shortLabel: 'Stage 6',
    primaryComponents: ['residential', 'open_spaces', 'amenities', 'club_house'],
    residentialMilestone: 'G+15 floor completion',
    commercialMilestone: '—',
    amenityMilestone: 'Open spaces, amenities & club house complete',
    keyMilestone: 'Township substantially complete',
    droneObjective: 'Confirm G+15 and amenity completion; generate township completion report.',
    modelStageId: 'final',
  },
]

const MISSION_MODEL_STAGES = [
  'initial',
  'stage1',
  'stage2',
  'stage3',
  'stage4',
  'stage5',
  'final',
] as const

/** Map survey mission → nearest available GLB for ortho top-view */
export function modelStageForMission(missionIndex: number, modelStageId?: string): string {
  if (modelStageId) return modelStageId
  const i = Math.max(0, Math.min(MISSION_MODEL_STAGES.length - 1, missionIndex))
  return MISSION_MODEL_STAGES[i]
}

export function stageDef(id: number): ConstructionStageDef | undefined {
  return CONSTRUCTION_STAGES.find((s) => s.id === id)
}

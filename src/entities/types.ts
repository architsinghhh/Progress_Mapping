/** Domain contracts — map 1:1 to future API / DB schemas */

export type ScheduleStatus = 'on_track' | 'ahead' | 'behind' | 'completed'

export type PhaseKey =
  | 'excavation'
  | 'plinth'
  | 'superstructure'
  | 'finishing'
  | 'landscaping'

/** Doc Stage 1–6 construction spine */
export type ConstructionStageId = 1 | 2 | 3 | 4 | 5 | 6

export type TownshipComponent =
  | 'residential'
  | 'commercial'
  | 'open_spaces'
  | 'amenities'
  | 'club_house'

export type SuperstructureElement = 'column' | 'beam' | 'slab'

export type LayerType = 'ortho' | 'dem' | 'contours' | 'model' | 'zoning'

export type TerrainRisk = 'stable' | 'rocky' | 'depression' | 'high_elevation' | 'soft_soil'

export interface Builder {
  id: string
  name: string
  region: string
  siteCount: number
}

export interface Project {
  id: string
  name: string
  type: 'township' | 'mall' | 'plaza' | 'theme_park' | 'society'
  location: string
  client: string
  builderId: string
  startDate: string
  targetDate: string
  totalAreaAcres: number
  description: string
  /** Portfolio card fields */
  overallProgress: number
  scheduleStatus: ScheduleStatus
  zoneCount: number
  lastSurveyDate: string
  headline: string
  /** Short schedule note on portfolio / header when behind or notable */
  remark?: string
  coverTone: 'sky' | 'ember' | 'forest' | 'slate'
  /** True only when this site has real Drive GLB / ortho capture (Greenfield in the demo). */
  hasSiteCapture: boolean
}


export interface Zone {
  id: string
  code: string
  name: string
  type: string
  color: string
  overallProgress: number
  scheduleStatus: ScheduleStatus
  /** Short schedule note — required when behind */
  remark?: string
  floorsPlanned: number
  floorsComplete: number
  pathD: string
  center: { x: number; y: number }
}

export interface ProgressItem {
  id: string
  zoneId: string
  phase: PhaseKey
  element?: SuperstructureElement
  label: string
  plannedDays: string
  plannedPercent: number
  onsitePercent: number
  status: ScheduleStatus
  remark?: string
  imageLabel?: string
  lastUpdated: string
  evidenceNote?: string
  measuredBy?: string
}

export interface SurveyMission {
  id: string
  date: string
  label: string
  dayOffset: number
  notes: string
  layers: LayerType[]
  /** Doc Stage 1–6 this survey primarily represents */
  constructionStage?: ConstructionStageId
  /** 3D / ortho top-view model stage id from model-index */
  modelStageId?: string
  /** Mock aerial metadata — swap for real EXIF / processing report later */
  gsdCm?: number
  altitudeM?: number
  droneId?: string
  coverageHa?: number
}

export interface TerrainFeature {
  id: string
  zoneId?: string
  type: TerrainRisk
  label: string
  x: number
  y: number
  severity: 'low' | 'medium' | 'high'
  detail: string
}

export interface ProgressSnapshot {
  date: string
  /** Component-wise cumulative % (doc §6) */
  residential: number
  commercial: number
  openSpaces: number
  amenities: number
  clubHouse: number
  plannedResidential: number
  plannedCommercial: number
  plannedOpenSpaces: number
  plannedAmenities: number
  plannedClubHouse: number
}

export interface ConstructionStageDef {
  id: ConstructionStageId
  label: string
  shortLabel: string
  primaryComponents: TownshipComponent[]
  residentialMilestone: string
  commercialMilestone: string
  amenityMilestone: string
  keyMilestone: string
  droneObjective: string
  /** model-index stage id when a GLB exists */
  modelStageId?: string
}

export interface Insight {
  id: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  title: string
  body: string
  zoneId?: string
  action?: string
  /** When set, focuses Ortho / DEM / floor-wise evidence in the matching workspace. */
  comparisonMode?: 'ortho' | 'dem' | 'floor'
  terrainId?: string
  phaseKey?: string
}

export interface ComparisonFrame {
  id: string
  missionId: string
  label: string
  kind: 'ortho' | 'dem' | 'contours' | 'floor'
  description: string
  visual: string
}

export interface FloorComparison {
  floor: number
  planned: number
  actual: number
  status: ScheduleStatus
  remark?: string
  elements: { column: number; beam: number; slab: number }
}

export interface DelayForecast {
  id: string
  zoneId: string
  phase: string
  slipDays: number
  slipRange: string
  probability: number
  criticalPath: boolean
  impact: string
  recommendation: string
  trend: number[]
}

export interface VolumeDiff {
  zoneId: string
  zoneCode: string
  zoneName: string
  cutM3: number
  fillM3: number
  netM3: number
  rockRemainingM3?: number
  changeLabel: string
}

export interface SiteKpi {
  id: string
  label: string
  value: string
  delta: string
  tone: 'neutral' | 'good' | 'warn' | 'bad'
  hint: string
}

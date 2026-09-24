/** The Sage by Repose — seeded from public/Sage Excel (villa status + Gantt). */
import type {
  ComparisonFrame,
  DelayForecast,
  Insight,
  ProgressItem,
  ProgressSnapshot,
  Project,
  ScheduleStatus,
  SurveyMission,
  TerrainFeature,
  VolumeDiff,
  Zone,
} from '@/entities/types'
import { buildFloorComparisons } from '@/shared/lib/floorProgress'

export const sageProject: Project = {
  id: 'prj_sage_repose',
  name: 'The Sage by Repose',
  type: 'township',
  location: 'Lohr',
  client: 'Repose',
  builderId: 'bld_horizon',
  startDate: '2024-10-01',
  targetDate: '2027-12-31',
  totalAreaAcres: 50,
  description:
    'Villa township — home zones load from Excel Sheet2 (North / South / lounge / clubhouse / roads / landscaping).',
  overallProgress: 0,
  scheduleStatus: 'behind',
  zoneCount: 0,
  lastSurveyDate: '2026-08-30',
  headline: 'Zones from Excel · drop updated workbook under public/Sage',
  remark: 'Sheet2 drives the home zone strip — reload after replacing the file',
  coverTone: 'forest',
  hasSiteCapture: false,
  excelSource: '/Sage/Reports/Reports/The%20sage%20by%20repose.xlsx',
}

/** Fallback only if Excel fails to load — replaced at runtime from Sheet2. */
export const sageZones: Zone[] = []
function statusFromPct(onsite: number, planned: number): ScheduleStatus {
  if (onsite >= 95) return 'completed'
  if (onsite + 8 < planned) return 'behind'
  if (onsite > planned + 5) return 'ahead'
  return 'on_track'
}

function sageProgress(zoneId: string): ProgressItem[] {
  const z = sageZones.find((x) => x.id === zoneId)
  if (!z) return []
  const p = z.overallProgress
  const civil = Math.min(100, Math.round(p * 1.15))
  const mep = Math.min(100, Math.round(p * 0.85))
  const fin = Math.min(100, Math.round(p * 0.55))
  const land = Math.min(100, Math.round(p * 0.35))
  const mk = (id: string, phase: ProgressItem['phase'], label: string, onsite: number, planned: number, remark: string): ProgressItem => ({
    id,
    zoneId,
    phase,
    label,
    plannedDays: '—',
    plannedPercent: planned,
    onsitePercent: Math.min(100, onsite),
    status: statusFromPct(onsite, planned),
    remark,
    lastUpdated: '2026-08-30',
  })
  const infraIds = new Set(['sg_lounge', 'sg_club', 'sg_land', 'sg_road'])
  if (infraIds.has(zoneId) || zoneId === 'sg_north' || zoneId === 'sg_south') {
    if (zoneId === 'sg_north' || zoneId === 'sg_south') {
      return [
        mk(`${zoneId}_civ`, 'plinth', 'Civil work', civil, Math.min(100, civil + 5), 'Sheet2 villa package avg'),
        mk(`${zoneId}_mep`, 'superstructure', 'MEP work', mep, Math.min(100, Math.round(p * 0.9) + 10), z.remark ?? ''),
        mk(`${zoneId}_fin`, 'finishing', 'Finishing', fin, Math.min(100, Math.round(p * 0.7) + 15), 'Possession-linked'),
        mk(`${zoneId}_land`, 'landscaping', 'Landscape / handover prep', land, Math.min(100, Math.round(p * 0.5) + 10), ''),
      ]
    }
    return [
      mk(`${zoneId}_civ`, 'plinth', 'Civil / package works', p, Math.min(100, p + 5), z.remark ?? 'Sheet2 package'),
      mk(`${zoneId}_mep`, 'finishing', 'MEP / finishing', mep, Math.min(100, p), z.type),
    ]
  }
  return [
    mk(`${zoneId}_civ`, 'plinth', 'Civil / package works', p, Math.min(100, p + 5), z.remark ?? ''),
    mk(`${zoneId}_mep`, 'finishing', 'MEP / finishing', mep, Math.min(100, p), z.type),
  ]
}

const sageMissions: SurveyMission[] = [
  {
    id: 'sg_m0',
    date: '2024-12-15',
    label: 'Baseline · gates & wall',
    dayOffset: 0,
    notes: 'Main gate, material gate, boundary wall packages closed on Gantt.',
    layers: ['ortho', 'dem', 'contours'],
    gsdCm: 2.5,
    altitudeM: 120,
    droneId: '—',
    coverageHa: 20,
    constructionStage: 1,
  },
  {
    id: 'sg_m1',
    date: '2025-04-18',
    label: 'Villa wave 1 starts',
    dayOffset: 180,
    notes: 'Early North villas (N10/N05/N62) actual starts.',
    layers: ['ortho', 'dem', 'contours'],
    gsdCm: 2.5,
    altitudeM: 120,
    droneId: '—',
    coverageHa: 20,
    constructionStage: 2,
  },
  {
    id: 'sg_m2',
    date: '2025-11-18',
    label: 'Mid build checkpoint',
    dayOffset: 360,
    notes: 'Multiple Real Infra villas in structure.',
    layers: ['ortho', 'dem', 'contours'],
    gsdCm: 2.5,
    altitudeM: 120,
    droneId: '—',
    coverageHa: 20,
    constructionStage: 3,
  },
  {
    id: 'sg_m3',
    date: '2026-06-22',
    label: 'Status sheet · 22 Jun 2026',
    dayOffset: 540,
    notes: 'Villa progress report snapshot from site Excel.',
    layers: ['ortho', 'dem', 'contours'],
    gsdCm: 2.5,
    altitudeM: 120,
    droneId: '—',
    coverageHa: 20,
    constructionStage: 4,
  },
  {
    id: 'sg_m4',
    date: '2026-08-30',
    label: 'Status sheet · 30 Aug 2026',
    dayOffset: 720,
    notes: 'Latest villa stage-wise % imported into this demo.',
    layers: ['ortho', 'dem', 'contours'],
    gsdCm: 2.5,
    altitudeM: 120,
    droneId: '—',
    coverageHa: 20,
    constructionStage: 5,
  },
]

const sageSnapshots: ProgressSnapshot[] = [
  {
    date: 'Dec 24',
    residential: 17,
    commercial: 2,
    openSpaces: 40,
    amenities: 20,
    clubHouse: 10,
    plannedResidential: 27,
    plannedCommercial: 17,
    plannedOpenSpaces: 55,
    plannedAmenities: 40,
    plannedClubHouse: 30,
  },
  {
    date: 'Jun 25',
    residential: 27,
    commercial: 12,
    openSpaces: 48,
    amenities: 25,
    clubHouse: 14,
    plannedResidential: 37,
    plannedCommercial: 27,
    plannedOpenSpaces: 60,
    plannedAmenities: 48,
    plannedClubHouse: 35,
  },
  {
    date: 'Dec 25',
    residential: 33,
    commercial: 18,
    openSpaces: 56,
    amenities: 30,
    clubHouse: 18,
    plannedResidential: 43,
    plannedCommercial: 33,
    plannedOpenSpaces: 65,
    plannedAmenities: 56,
    plannedClubHouse: 40,
  },
  {
    date: 'Jun 26',
    residential: 38,
    commercial: 23,
    openSpaces: 64,
    amenities: 35,
    clubHouse: 22,
    plannedResidential: 48,
    plannedCommercial: 38,
    plannedOpenSpaces: 70,
    plannedAmenities: 64,
    plannedClubHouse: 45,
  },
  {
    date: 'Aug 26',
    residential: 41,
    commercial: 26,
    openSpaces: 72,
    amenities: 40,
    clubHouse: 26,
    plannedResidential: 51,
    plannedCommercial: 41,
    plannedOpenSpaces: 75,
    plannedAmenities: 72,
    plannedClubHouse: 50,
  },
]

const sageInsights: Insight[] = [
  {
    id: 'sg_i1',
    severity: 'warning',
    title: 'North & South villa packages behind',
    body: 'Sheet2 drives North / South zone averages. Reload Excel after PM updates the workbook.',
    action: 'Reload Excel on the zone strip',
    comparisonMode: 'ortho',
    zoneId: 'xl_north_zone',
  },
  {
    id: 'sg_i2',
    severity: 'critical',
    title: 'South Zone possession slips',
    body: 'Watch longest-slip villas under South Zone in the status workbook.',
    zoneId: 'xl_south_zone',
    action: 'Open Construction Progress',
    comparisonMode: 'floor',
  },
  {
    id: 'sg_i3',
    severity: 'info',
    title: 'Zones come from Excel Sheet2',
    body: 'Home packages are the Zones row in the workbook — not hardcoded villas.',
    zoneId: 'xl_common_area_landscaping_work_development',
    action: 'Replace workbook under public/Sage · Reload',
    comparisonMode: 'ortho',
  },
  {
    id: 'sg_i4',
    severity: 'info',
    title: 'Club House model in 3D',
    body: 'Club House package tracks in Excel; .skp loads in Periodic Monitoring.',
    zoneId: 'xl_club_house',
    action: 'Open 3D tab',
    comparisonMode: 'floor',
  },
]

const sageForecasts: DelayForecast[] = [
  {
    id: 'sg_df1',
    zoneId: 'xl_south_zone',
    phase: 'South Zone villa possession',
    slipDays: 55,
    slipRange: '50–63 days',
    probability: 78,
    criticalPath: true,
    impact: 'Buyer possession dates at risk vs Sheet2 commitments',
    recommendation: 'Daily finish checklist on worst-slip villas',
    trend: [9, 18, 27, 36, 45, 54],
  },
  {
    id: 'sg_df2',
    zoneId: 'xl_roads',
    phase: 'ROADS / Trimix',
    slipDays: 21,
    slipRange: '14–28 days',
    probability: 62,
    criticalPath: false,
    impact: 'Access / handover logistics for South Zone',
    recommendation: 'Parallel pour bays with landscaping',
    trend: [3, 6, 10, 14, 18, 21],
  },
]

const sageVolumes: VolumeDiff[] = [
  { zoneId: 'xl_roads', zoneCode: 'RD', zoneName: 'ROADS', cutM3: 420, fillM3: 180, netM3: -240, changeLabel: 'Trimix subgrade prep (est.)' },
  {
    zoneId: 'xl_common_area_landscaping_work_development',
    zoneCode: 'CL',
    zoneName: 'Common Area Landscaping',
    cutM3: 60,
    fillM3: 220,
    netM3: 160,
    changeLabel: 'Topsoil / planting beds (est.)',
  },
]

const sageTerrain: TerrainFeature[] = [
  {
    id: 'sg_t1',
    zoneId: 'xl_roads',
    type: 'soft_soil',
    label: 'Road subgrade soft spots',
    x: 420,
    y: 275,
    severity: 'medium',
    detail: 'ROADS package — watch monsoon saturation',
  },
]

export const sageBundle = {
  project: sageProject,
  zones: sageZones,
  missions: sageMissions,
  terrain: sageTerrain,
  snapshots: sageSnapshots,
  insights: sageInsights,
  comparisons: [] as ComparisonFrame[],
  forecasts: sageForecasts,
  volumes: sageVolumes,
  getProgress: sageProgress,
  getFloors: (zoneId) => {
    const z = sageZones.find((x) => x.id === zoneId)
    return z ? buildFloorComparisons(z) : []
  },
}

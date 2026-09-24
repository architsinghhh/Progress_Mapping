import { create } from 'zustand'
import type {
  Builder,
  ComparisonFrame,
  DelayForecast,
  FloorComparison,
  Insight,
  LayerType,
  ProgressItem,
  ProgressSnapshot,
  Project,
  SurveyMission,
  TerrainFeature,
  VolumeDiff,
  Zone,
} from '@/entities/types'
import { projectApi } from '@/services/api/projectApi'
import {
  excelSourceForProject,
  loadSiteExcelFromFile,
  loadSiteExcelFromUrl,
  synthesizeFloors,
  synthesizeProgress,
} from '@/services/excel/loadSiteExcel'
import type { ParsedPackage, ParsedVillaRow } from '@/services/excel/parseSiteWorkbook'
import { insightUsesSurveyCompare, resolveInsightWorkspaceTab } from '@/shared/lib/insightRouting'
import { loadWorkRemarks, saveWorkRemarks } from '@/shared/lib/workRemarks'

export type WorkspaceTab = 'overview' | 'siteprep' | 'progress' | 'survey'
export type ComparisonMode = 'ortho' | 'dem' | 'floor'

interface AppState {
  ready: boolean
  loading: boolean
  /** Portfolio loaded (builder + project cards) */
  portfolioReady: boolean
  builder: Builder | null
  projects: Project[]
  activeProjectId: string | null
  project: Project | null
  zones: Zone[]
  /** True when current zones were loaded from an Excel workbook */
  zonesFromExcel: boolean
  excelLoadError: string | null
  /** Villa rows from Sheet2 (North/South packages) — used in progress panel */
  excelVillas: ParsedVillaRow[]
  /** Sheet1 packages (lounge / club / roads / landscaping) */
  excelPackages: ParsedPackage[]
  selectedZoneId: string
  progress: ProgressItem[]
  missions: SurveyMission[]
  activeMissionIndex: number
  compareThenIndex: number
  compareNowIndex: number
  terrain: TerrainFeature[]
  snapshots: ProgressSnapshot[]
  insights: Insight[]
  comparisons: ComparisonFrame[]
  floors: FloorComparison[]
  forecasts: DelayForecast[]
  volumes: VolumeDiff[]
  activeLayers: LayerType[]
  workspaceTab: WorkspaceTab
  comparisonMode: ComparisonMode
  sliderPosition: number
  highlightPhase: string | null
  selectedFloor: number | null
  selectedTerrainId: string | null
  focusedInsightId: string | null
  evidenceItemId: string | null
  whatIfActive: boolean
  pulseCriticalPath: boolean
  orthoFullscreen: boolean
  summaryOpen: boolean
  /** User-authored work remarks keyed by zone/floor/stage (persisted per project). */
  workRemarks: Record<string, string>
  loadPortfolio: () => Promise<void>
  openProject: (projectId: string) => Promise<void>
  exitToPortfolio: () => void
  selectZone: (id: string) => Promise<void>
  /** Re-fetch project excelSource URL and replace zones */
  reloadZonesFromExcel: () => Promise<void>
  /** User-picked workbook (any project) */
  importZonesFromExcelFile: (file: File) => Promise<void>
  setMissionIndex: (i: number) => void
  setCompareThenIndex: (i: number) => void
  setCompareNowIndex: (i: number) => void
  toggleLayer: (layer: LayerType) => void
  setWorkspaceTab: (tab: WorkspaceTab) => void
  setComparisonMode: (mode: ComparisonMode) => void
  setSliderPosition: (v: number) => void
  setHighlightPhase: (phase: string | null) => void
  setSelectedFloor: (floor: number | null) => void
  setSelectedTerrainId: (id: string | null) => void
  focusInsight: (insight: Insight) => Promise<void>
  openEvidence: (itemId: string | null) => void
  toggleWhatIf: () => void
  setPulseCriticalPath: (v: boolean) => void
  setOrthoFullscreen: (v: boolean) => void
  setSummaryOpen: (v: boolean) => void
  setWorkRemark: (key: string, text: string) => void
}

function applyExcelZonesToProject(project: Project, zones: Zone[], asOf?: string): Project {
  const avg = zones.length
    ? Math.round(zones.reduce((s, z) => s + z.overallProgress, 0) / zones.length)
    : project.overallProgress
  const behind = zones.filter((z) => z.scheduleStatus === 'behind').length
  return {
    ...project,
    zoneCount: zones.length,
    overallProgress: avg,
    scheduleStatus: behind > 0 ? 'behind' : project.scheduleStatus,
    lastSurveyDate: asOf ?? project.lastSurveyDate,
    headline: `${zones.length} zones from Excel`,
    remark: asOf ? `Workbook as of ${asOf}` : 'Zones loaded from Excel',
  }
}

const emptyWorkspace = {
  project: null as Project | null,
  zones: [] as Zone[],
  zonesFromExcel: false,
  excelLoadError: null as string | null,
  excelVillas: [] as ParsedVillaRow[],
  excelPackages: [] as ParsedPackage[],
  selectedZoneId: '',
  progress: [] as ProgressItem[],
  missions: [] as SurveyMission[],
  activeMissionIndex: 0,
  compareThenIndex: 0,
  compareNowIndex: 0,
  terrain: [] as TerrainFeature[],
  snapshots: [] as ProgressSnapshot[],
  insights: [] as Insight[],
  comparisons: [] as ComparisonFrame[],
  floors: [] as FloorComparison[],
  forecasts: [] as DelayForecast[],
  volumes: [] as VolumeDiff[],
  workspaceTab: 'overview' as WorkspaceTab,
  comparisonMode: 'ortho' as ComparisonMode,
  sliderPosition: 55,
  highlightPhase: null as string | null,
  selectedFloor: null as number | null,
  selectedTerrainId: null as string | null,
  focusedInsightId: null as string | null,
  evidenceItemId: null as string | null,
  whatIfActive: false,
  pulseCriticalPath: false,
  orthoFullscreen: false,
  summaryOpen: false,
  workRemarks: {} as Record<string, string>,
  ready: false,
}

export const useAppStore = create<AppState>((set, get) => ({
  ...emptyWorkspace,
  loading: false,
  portfolioReady: false,
  builder: null,
  projects: [],
  activeProjectId: null,
  activeLayers: ['ortho', 'zoning'],

  loadPortfolio: async () => {
    set({ loading: true })
    const [builder, projects] = await Promise.all([projectApi.getBuilder(), projectApi.listProjects()])
    set({
      builder,
      projects,
      portfolioReady: true,
      loading: false,
      activeProjectId: null,
      ...emptyWorkspace,
    })
  },

  openProject: async (projectId) => {
    set({ loading: true, ready: false, activeProjectId: projectId, excelLoadError: null })
    const needPortfolio = get().projects.length === 0
    const portfolioPromise = needPortfolio
      ? Promise.all([projectApi.getBuilder(), projectApi.listProjects()])
      : Promise.resolve(null)
    const [portfolio, project, zones, missions, terrain, snapshots, insights, comparisons, forecasts, volumes] =
      await Promise.all([
        portfolioPromise,
        projectApi.getProject(projectId),
        projectApi.getZones(projectId),
        projectApi.getMissions(projectId),
        projectApi.getTerrain(projectId),
        projectApi.getSnapshots(projectId),
        projectApi.getInsights(projectId),
        projectApi.getComparisons(projectId),
        projectApi.getDelayForecasts(projectId),
        projectApi.getVolumeDiffs(projectId),
      ])
    if (portfolio) {
      const [builder, projects] = portfolio
      set({ builder, projects, portfolioReady: true })
    }

    let nextProject = project
    let nextZones = zones
    let nextVillas: ParsedVillaRow[] = []
    let nextPackages: ParsedPackage[] = []
    let zonesFromExcel = false
    let excelLoadError: string | null = null
    const excelUrl = project.excelSource ?? excelSourceForProject(projectId)
    if (excelUrl) {
      try {
        const parsed = await loadSiteExcelFromUrl(excelUrl)
        nextZones = parsed.zones
        nextVillas = parsed.villas
        nextPackages = parsed.packages
        nextProject = applyExcelZonesToProject(project, parsed.zones, parsed.asOf)
        zonesFromExcel = true
      } catch (e) {
        excelLoadError = e instanceof Error ? e.message : 'Failed to load Excel'
      }
    }

    const selectedZoneId = nextZones[0]?.id ?? ''
    const last = Math.max(0, missions.length - 1)
    let progress: ProgressItem[]
    let floors: FloorComparison[]
    if (zonesFromExcel && nextZones[0]) {
      progress = synthesizeProgress(nextZones[0], nextPackages)
      floors = synthesizeFloors(nextZones[0])
    } else {
      ;[progress, floors] = await Promise.all([
        projectApi.getProgress(projectId, selectedZoneId),
        projectApi.getFloorComparisons(projectId, selectedZoneId),
      ])
    }
    set({
      project: nextProject,
      zones: nextZones,
      zonesFromExcel,
      excelLoadError,
      excelVillas: nextVillas,
      excelPackages: nextPackages,
      selectedZoneId,
      progress,
      missions,
      terrain,
      snapshots,
      insights,
      comparisons,
      floors,
      forecasts,
      volumes,
      activeMissionIndex: last,
      compareThenIndex: 0,
      compareNowIndex: last,
      workspaceTab: 'overview',
      comparisonMode: 'ortho',
      sliderPosition: 55,
      highlightPhase: null,
      selectedFloor: null,
      selectedTerrainId: null,
      focusedInsightId: null,
      evidenceItemId: null,
      whatIfActive: false,
      pulseCriticalPath: false,
      orthoFullscreen: false,
      summaryOpen: false,
      workRemarks: loadWorkRemarks(projectId),
      ready: true,
      loading: false,
    })
  },

  exitToPortfolio: () => {
    set({
      activeProjectId: null,
      ...emptyWorkspace,
      loading: false,
    })
  },

  selectZone: async (id) => {
    const projectId = get().activeProjectId
    if (!projectId || id === get().selectedZoneId) return
    set({ selectedZoneId: id, loading: true, selectedFloor: null, evidenceItemId: null })
    if (get().zonesFromExcel) {
      const zone = get().zones.find((z) => z.id === id)
      if (zone) {
        set({
          progress: synthesizeProgress(zone, get().excelPackages),
          floors: synthesizeFloors(zone),
          loading: false,
        })
        return
      }
    }
    const [progress, floors] = await Promise.all([
      projectApi.getProgress(projectId, id),
      projectApi.getFloorComparisons(projectId, id),
    ])
    set({ progress, floors, loading: false })
  },

  reloadZonesFromExcel: async () => {
    const project = get().project
    const projectId = get().activeProjectId
    if (!project || !projectId) return
    const url = project.excelSource ?? excelSourceForProject(projectId)
    if (!url) {
      set({ excelLoadError: 'No Excel source configured for this project' })
      return
    }
    set({ loading: true, excelLoadError: null })
    try {
      const parsed = await loadSiteExcelFromUrl(url)
      const nextProject = applyExcelZonesToProject(project, parsed.zones, parsed.asOf)
      const selectedZoneId = parsed.zones[0]?.id ?? ''
      set({
        project: nextProject,
        zones: parsed.zones,
        zonesFromExcel: true,
        excelVillas: parsed.villas,
        excelPackages: parsed.packages,
        selectedZoneId,
        progress: parsed.zones[0] ? synthesizeProgress(parsed.zones[0], parsed.packages) : [],
        floors: parsed.zones[0] ? synthesizeFloors(parsed.zones[0]) : [],
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        excelLoadError: e instanceof Error ? e.message : 'Failed to reload Excel',
      })
    }
  },

  importZonesFromExcelFile: async (file) => {
    const project = get().project
    if (!project) return
    set({ loading: true, excelLoadError: null })
    try {
      const parsed = await loadSiteExcelFromFile(file)
      const nextProject = applyExcelZonesToProject(project, parsed.zones, parsed.asOf)
      const selectedZoneId = parsed.zones[0]?.id ?? ''
      set({
        project: nextProject,
        zones: parsed.zones,
        zonesFromExcel: true,
        excelVillas: parsed.villas,
        excelPackages: parsed.packages,
        selectedZoneId,
        progress: parsed.zones[0] ? synthesizeProgress(parsed.zones[0], parsed.packages) : [],
        floors: parsed.zones[0] ? synthesizeFloors(parsed.zones[0]) : [],
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        excelLoadError: e instanceof Error ? e.message : 'Failed to import Excel',
      })
    }
  },

  setMissionIndex: (i) => {
    const then = get().compareThenIndex
    set({
      activeMissionIndex: i,
      compareNowIndex: i,
      compareThenIndex: then >= i ? Math.max(0, i - 1) : then,
    })
  },

  setCompareThenIndex: (i) => {
    const now = get().compareNowIndex
    const nextNow = i >= now ? Math.min(get().missions.length - 1, i + 1) : now
    set({ compareThenIndex: i, compareNowIndex: nextNow, activeMissionIndex: nextNow })
  },

  setCompareNowIndex: (i) => {
    const then = get().compareThenIndex
    const nextThen = i <= then ? Math.max(0, i - 1) : then
    set({ compareNowIndex: i, compareThenIndex: nextThen, activeMissionIndex: i })
  },

  toggleLayer: (layer) => {
    const current = get().activeLayers
    set({
      activeLayers: current.includes(layer)
        ? current.filter((l) => l !== layer)
        : [...current, layer],
    })
  },

  setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
  setComparisonMode: (mode) => set({ comparisonMode: mode, sliderPosition: 50 }),
  setSliderPosition: (v) => set({ sliderPosition: v }),
  setHighlightPhase: (phase) => set({ highlightPhase: phase }),
  setSelectedFloor: (floor) => set({ selectedFloor: floor }),
  setSelectedTerrainId: (id) => set({ selectedTerrainId: id }),

  focusInsight: async (insight) => {
    const tab = resolveInsightWorkspaceTab(insight)
    set({
      focusedInsightId: insight.id,
      pulseCriticalPath: insight.severity === 'critical',
      selectedTerrainId: insight.terrainId ?? null,
      highlightPhase: insight.phaseKey ?? null,
      workspaceTab: tab,
    })
    if (insightUsesSurveyCompare(insight) && insight.comparisonMode) {
      set({ comparisonMode: insight.comparisonMode, sliderPosition: 42 })
    }
    if (insight.zoneId && insight.zoneId !== get().selectedZoneId) {
      const exists = get().zones.some((z) => z.id === insight.zoneId)
      if (exists) await get().selectZone(insight.zoneId)
    }
    window.setTimeout(() => set({ pulseCriticalPath: false }), 3200)
  },

  openEvidence: (itemId) => set({ evidenceItemId: itemId }),
  toggleWhatIf: () => set({ whatIfActive: !get().whatIfActive }),
  setPulseCriticalPath: (v) => set({ pulseCriticalPath: v }),
  setOrthoFullscreen: (v) => set({ orthoFullscreen: v }),
  setSummaryOpen: (v) => set({ summaryOpen: v }),
  setWorkRemark: (key, text) => {
    const projectId = get().activeProjectId
    const trimmed = text.trim()
    const prev = get().workRemarks
    const next = { ...prev }
    if (!trimmed) delete next[key]
    else next[key] = trimmed
    set({ workRemarks: next })
    if (projectId) saveWorkRemarks(projectId, next)
  },
}))

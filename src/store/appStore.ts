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

export type WorkspaceTab = 'overview' | 'siteprep' | 'progress' | 'survey' | 'model'
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
  loadPortfolio: () => Promise<void>
  openProject: (projectId: string) => Promise<void>
  exitToPortfolio: () => void
  selectZone: (id: string) => Promise<void>
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
}

const emptyWorkspace = {
  project: null as Project | null,
  zones: [] as Zone[],
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
    set({ loading: true, ready: false, activeProjectId: projectId })
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
    const selectedZoneId = zones[0]?.id ?? ''
    const last = Math.max(0, missions.length - 1)
    const [progress, floors] = await Promise.all([
      projectApi.getProgress(projectId, selectedZoneId),
      projectApi.getFloorComparisons(projectId, selectedZoneId),
    ])
    set({
      project,
      zones,
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
    const [progress, floors] = await Promise.all([
      projectApi.getProgress(projectId, id),
      projectApi.getFloorComparisons(projectId, id),
    ])
    set({ progress, floors, loading: false })
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
    const nextMode = insight.comparisonMode
    const tab =
      nextMode === 'floor'
        ? 'progress'
        : nextMode
          ? 'survey'
          : insight.severity === 'critical'
            ? 'siteprep'
            : 'overview'
    set({
      focusedInsightId: insight.id,
      pulseCriticalPath: insight.severity === 'critical',
      selectedTerrainId: insight.terrainId ?? null,
      highlightPhase: insight.phaseKey ?? null,
      workspaceTab: tab,
    })
    if (nextMode && nextMode !== 'floor') set({ comparisonMode: nextMode, sliderPosition: 42 })
    if (insight.zoneId && insight.zoneId !== get().selectedZoneId) {
      await get().selectZone(insight.zoneId)
    }
    window.setTimeout(() => set({ pulseCriticalPath: false }), 3200)
  },

  openEvidence: (itemId) => set({ evidenceItemId: itemId }),
  toggleWhatIf: () => set({ whatIfActive: !get().whatIfActive }),
  setPulseCriticalPath: (v) => set({ pulseCriticalPath: v }),
  setOrthoFullscreen: (v) => set({ orthoFullscreen: v }),
  setSummaryOpen: (v) => set({ summaryOpen: v }),
}))

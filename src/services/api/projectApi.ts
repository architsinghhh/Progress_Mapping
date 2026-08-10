/**
 * API service facade — today returns mocks; tomorrow swap for REST/GraphQL.
 * All workspace calls are scoped to an active projectId.
 */

import type {
  Builder,
  ComparisonFrame,
  DelayForecast,
  FloorComparison,
  Insight,
  ProgressItem,
  ProgressSnapshot,
  Project,
  SurveyMission,
  TerrainFeature,
  VolumeDiff,
  Zone,
} from '@/entities/types'
import {
  builder as mockBuilder,
  getDefaultProjectId,
  getSiteBundle,
  portfolioProjects,
} from '@/services/mocks/siteRegistry'

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms))

function requireBundle(projectId: string) {
  const bundle = getSiteBundle(projectId)
  if (!bundle) throw new Error(`Unknown project: ${projectId}`)
  return bundle
}

export const projectApi = {
  async getBuilder(): Promise<Builder> {
    await delay(80)
    return { ...mockBuilder, siteCount: portfolioProjects.length }
  },

  async listProjects(): Promise<Project[]> {
    await delay(120)
    return portfolioProjects
  },

  async getProject(projectId = getDefaultProjectId()): Promise<Project> {
    await delay()
    return requireBundle(projectId).project
  },

  async getZones(projectId: string): Promise<Zone[]> {
    await delay()
    return requireBundle(projectId).zones
  },

  async getProgress(projectId: string, zoneId: string): Promise<ProgressItem[]> {
    await delay(90)
    return requireBundle(projectId).getProgress(zoneId)
  },

  async getMissions(projectId: string): Promise<SurveyMission[]> {
    await delay()
    return requireBundle(projectId).missions
  },

  async getTerrain(projectId: string): Promise<TerrainFeature[]> {
    await delay()
    return requireBundle(projectId).terrain
  },

  async getSnapshots(projectId: string): Promise<ProgressSnapshot[]> {
    await delay()
    return requireBundle(projectId).snapshots
  },

  async getInsights(projectId: string): Promise<Insight[]> {
    await delay()
    return requireBundle(projectId).insights
  },

  async getComparisons(projectId: string): Promise<ComparisonFrame[]> {
    await delay()
    return requireBundle(projectId).comparisons
  },

  async getFloorComparisons(projectId: string, zoneId: string): Promise<FloorComparison[]> {
    await delay()
    return requireBundle(projectId).getFloors(zoneId)
  },

  async getDelayForecasts(projectId: string): Promise<DelayForecast[]> {
    await delay()
    return requireBundle(projectId).forecasts
  },

  async getVolumeDiffs(projectId: string): Promise<VolumeDiff[]> {
    await delay()
    return requireBundle(projectId).volumes
  },
}

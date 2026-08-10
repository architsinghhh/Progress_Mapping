import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppHeader } from '@/app/layout/AppHeader'
import { useAppStore } from '@/store/appStore'
import { KpiStrip } from '@/features/dashboard/KpiStrip'
import { ZoneProgressStrip } from '@/features/dashboard/ZoneProgressStrip'
import { WorkspaceNav } from '@/features/dashboard/WorkspaceNav'
import { SitePlanPanel } from '@/features/site-plan/SitePlanPanel'
import { ProgressTablePanel } from '@/features/progress/ProgressTablePanel'
import { FloorWisePanel } from '@/features/progress/FloorWisePanel'
import { ProgressChartPanel } from '@/features/analytics/ProgressChartPanel'
import { StageGanttPanel, StageMatrixPanel } from '@/features/schedule/StagePanels'
import { ComparisonPanel } from '@/features/comparison/ComparisonPanel'
import { ContoursPanel } from '@/features/comparison/ContoursPanel'
import { TimelapseBar } from '@/features/timelapse/TimelapseBar'
import { InsightsPanel } from '@/features/insights/InsightsPanel'
import { ForecastPanel } from '@/features/forecast/ForecastPanel'
import { VolumePanel } from '@/features/volume/VolumePanel'
import { ModelComparePanel } from '@/features/model3d/ModelComparePanel'
import { EvidenceDrawer } from '@/features/evidence/EvidenceDrawer'
import { ExecutiveSummaryModal } from '@/features/dashboard/ExecutiveSummaryModal'
import { AppBrandFooter } from '@/shared/ui/AppBrandFooter'
import { AjnhawkLogo } from '@/shared/ui/AjnhawkLogo'

function BootScreen({ label }: { label?: string }) {
  return (
    <div className="boot-screen app-bg">
      <div className="app-bg__grid" aria-hidden />
      <div className="app-bg__orb app-bg__orb--a" aria-hidden />
      <div className="app-bg__orb app-bg__orb--b" aria-hidden />
      <motion.div
        className="boot-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AjnhawkLogo size="lg" className="mx-auto" />
        <p className="mt-4 text-sm font-medium text-[#64748b]">
          {label ?? 'Loading workspace…'}
        </p>
        <div className="boot-bar">
          <span />
        </div>
      </motion.div>
    </div>
  )
}

function OverviewTab() {
  return (
    <div className="flex flex-col gap-5">
      <TimelapseBar />
      <div className="grid gap-5 xl:grid-cols-12 xl:items-stretch">
        <div className="min-h-[480px] xl:col-span-7 xl:h-[540px] [&>*]:h-full">
          <SitePlanPanel />
        </div>
        <div className="min-h-[320px] xl:col-span-5 xl:h-[540px] [&>*]:h-full">
          <InsightsPanel />
        </div>
      </div>
    </div>
  )
}

function SitePreparationTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="min-h-[320px]">
        <StageMatrixPanel />
      </div>
      <div className="min-h-[380px]">
        <ContoursPanel />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="min-h-[420px] [&>*]:h-full">
          <ForecastPanel />
        </div>
        <div className="min-h-[420px] [&>*]:h-full">
          <VolumePanel />
        </div>
      </div>
    </div>
  )
}

function ProgressTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="min-h-[260px]">
        <StageGanttPanel />
      </div>
      <div className="min-h-[480px]">
        <FloorWisePanel />
      </div>
      <div className="grid gap-5 xl:grid-cols-12 xl:items-stretch">
        <div className="min-h-[420px] xl:col-span-7 xl:h-[520px] [&>*]:h-full">
          <ProgressTablePanel />
        </div>
        <div className="min-h-[320px] xl:col-span-5 xl:h-[520px] [&>*]:h-full">
          <ProgressChartPanel />
        </div>
      </div>
    </div>
  )
}

function SurveyTab() {
  return (
    <div className="flex flex-col gap-5">
      <TimelapseBar />
      <div className="min-h-[580px]">
        <ComparisonPanel />
      </div>
    </div>
  )
}

function ModelTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="min-h-[560px]">
        <ModelComparePanel />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const ready = useAppStore((s) => s.ready)
  const openProject = useAppStore((s) => s.openProject)
  const exitToPortfolio = useAppStore((s) => s.exitToPortfolio)
  const workspaceTab = useAppStore((s) => s.workspaceTab)
  const project = useAppStore((s) => s.project)

  useEffect(() => {
    if (!projectId) {
      navigate('/', { replace: true })
      return
    }
    void openProject(projectId).catch(() => {
      exitToPortfolio()
      navigate('/', { replace: true })
    })
  }, [projectId, openProject, exitToPortfolio, navigate])

  return (
    <AnimatePresence mode="wait">
      {!ready || !project || project.id !== projectId ? (
        <BootScreen key="boot" label={projectId ? 'Opening project workspace…' : undefined} />
      ) : (
        <motion.div
          key={projectId}
          className="app-bg flex h-full min-h-screen flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div className="app-bg__grid" aria-hidden />
          <div className="app-bg__orb app-bg__orb--a" aria-hidden />
          <div className="app-bg__orb app-bg__orb--b" aria-hidden />

          <div className="app-content flex min-h-screen flex-col">
            <AppHeader />

            <main className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col gap-4 px-4 py-4">
              <KpiStrip />
              <ZoneProgressStrip />
              <WorkspaceNav />

              <AnimatePresence mode="wait">
                <motion.div
                  key={workspaceTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {workspaceTab === 'overview' && <OverviewTab />}
                  {workspaceTab === 'siteprep' && <SitePreparationTab />}
                  {workspaceTab === 'progress' && <ProgressTab />}
                  {workspaceTab === 'survey' && <SurveyTab />}
                  {workspaceTab === 'model' && <ModelTab />}
                </motion.div>
              </AnimatePresence>
            </main>

            <AppBrandFooter
              compact
              onLogoClick={() => {
                exitToPortfolio()
                navigate('/')
              }}
            />
            <EvidenceDrawer />
            <ExecutiveSummaryModal />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

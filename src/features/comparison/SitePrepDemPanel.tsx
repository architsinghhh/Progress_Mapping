import { Mountain } from 'lucide-react'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { formatMonthYear, cn } from '@/shared/lib/utils'
import { demUrlForMission } from '@/features/comparison/demSource'
import { modelStageForMission } from '@/entities/constructionStages'

/** Site Preparation — single DEM elevation still for the active survey mission. */
export function SitePrepDemPanel() {
  const project = useAppStore((s) => s.project)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const zone = useAppStore((s) => s.zones.find((z) => z.id === s.selectedZoneId))
  const hasCapture = Boolean(project?.hasSiteCapture)

  const mission = missions[activeMissionIndex]
  const currentStage = modelStageForMission(activeMissionIndex)
  const demSrc = hasCapture
    ? demUrlForMission({ missionIndex: activeMissionIndex, modelStageId: currentStage })
    : null

  return (
    <Panel
      title="Digital elevation model"
      accent="blue"
      action={
        <span className="text-[10px] font-semibold text-slate-500">
          {mission?.label ?? 'Survey'} · site prep
        </span>
      }
      className="h-full"
      bodyClassName="flex flex-col gap-3 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          <span className="font-display font-bold text-slate-800">{zone?.name ?? 'Site-wide'}</span>
          <span className="mx-1.5">·</span>
          <span>Elevation surface from survey DEM</span>
        </div>
        <div className="font-medium text-slate-600">
          {mission?.label ?? '—'}
          {mission ? ` · ${formatMonthYear(mission.date)}` : ''}
        </div>
      </div>

      <div className="siteprep-dem">
        {demSrc ? (
          <img
            src={demSrc}
            alt={`DEM ${mission?.label ?? ''}`}
            className="siteprep-dem__img"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <DemEmpty hasCapture={hasCapture} />
        )}
      </div>
    </Panel>
  )
}

function DemEmpty({ hasCapture }: { hasCapture: boolean }) {
  return (
    <div className={cn('siteprep-dem__empty')}>
      <Mountain className="size-5 opacity-50" />
      <p>{hasCapture ? 'DEM still pending for this stage' : 'Demo site — DEM capture not linked'}</p>
    </div>
  )
}

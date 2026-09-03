import { Mountain } from 'lucide-react'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { formatMonthYear, cn } from '@/shared/lib/utils'
import { demUrlForMission } from '@/features/comparison/demSource'
import { modelStageForMission } from '@/entities/constructionStages'

/** Site Preparation — DEM elevation still for the active survey mission. */
export function SitePrepDemPanel() {
  const project = useAppStore((s) => s.project)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const zone = useAppStore((s) => s.zones.find((z) => z.id === s.selectedZoneId))
  const hasCapture = Boolean(project?.hasSiteCapture)

  const mission = missions[activeMissionIndex]
  const currentStage = modelStageForMission(activeMissionIndex)
  const baselineStage = modelStageForMission(0)
  const demSrc = hasCapture
    ? demUrlForMission({ missionIndex: activeMissionIndex, modelStageId: currentStage })
    : null
  const baselineSrc = hasCapture
    ? demUrlForMission({ missionIndex: 0, modelStageId: baselineStage })
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
        <div className="siteprep-dem__stage">
          <div className="siteprep-dem__tag">Current · {mission?.label ?? 'Now'}</div>
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

        <div className="siteprep-dem__stage siteprep-dem__stage--base">
          <div className="siteprep-dem__tag">Baseline · Initial</div>
          {baselineSrc ? (
            <img
              src={baselineSrc}
              alt="Baseline DEM"
              className="siteprep-dem__img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <DemEmpty hasCapture={hasCapture} compact />
          )}
        </div>
      </div>
    </Panel>
  )
}

function DemEmpty({ hasCapture, compact }: { hasCapture: boolean; compact?: boolean }) {
  return (
    <div className={cn('siteprep-dem__empty', compact && 'is-compact')}>
      <Mountain className="size-5 opacity-50" />
      <p>{hasCapture ? 'DEM still pending for this stage' : 'Demo site — DEM capture not linked'}</p>
    </div>
  )
}

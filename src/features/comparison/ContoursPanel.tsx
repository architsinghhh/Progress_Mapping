import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { formatMonthYear } from '@/shared/lib/utils'

const CONTOURS_SRC = '/media/Contours.png'

/** Site-prep contours — Initial Stage / base-level survey still. */
export function ContoursPanel() {
  const project = useAppStore((s) => s.project)
  const zone = useAppStore((s) => s.zones.find((z) => z.id === s.selectedZoneId))
  const missions = useAppStore((s) => s.missions)
  const baseline = missions[0]

  const siteKind = project?.type ?? 'township'
  const title =
    siteKind === 'mall'
      ? 'Contours · Mall site'
      : siteKind === 'society'
        ? 'Contours · Society site'
        : 'Contours · Site Preparation'

  return (
    <Panel title={title} accent="blue" className="h-full" bodyClassName="flex flex-col gap-3 p-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          <span className="font-display font-bold text-slate-800">{zone?.name ?? 'Site-wide'}</span>
          <span className="mx-1.5">·</span>
          <span>Base-level topo · Initial Stage DEM</span>
        </div>
        <div className="font-medium text-slate-600">
          {baseline?.label ?? 'Initial Stage'}
          {baseline ? ` · ${formatMonthYear(baseline.date)}` : ''}
        </div>
      </div>

      <div className="contours-frame flex items-center justify-center overflow-hidden rounded-xl bg-slate-100/80 p-3">
        <img
          src={CONTOURS_SRC}
          alt="Initial Stage base-level topographic contour map"
          className="mx-auto h-auto max-h-[320px] w-auto max-w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
    </Panel>
  )
}

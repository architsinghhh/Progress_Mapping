import { useMemo, useState } from 'react'
import { Panel } from '@/shared/ui/Panel'
import { SiteModelCanvas } from '@/features/model3d/SiteModelCanvas'
import { skpAssetsForProject, type SkpAsset } from '@/features/model3d/skpToGlb'
import { RotateCcw, RotateCw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type SkpModelViewerProps = {
  projectId: string
  siteName?: string
  className?: string
}

/** SketchUp (.skp) viewer — does not use the Drive GLB pipeline. */
export function SkpModelViewer({ projectId, siteName, className }: SkpModelViewerProps) {
  const assets = useMemo(() => skpAssetsForProject(projectId), [projectId])
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '')
  const [autoRotate, setAutoRotate] = useState(false)
  const [fitKey, setFitKey] = useState(0)

  const active: SkpAsset | undefined =
    assets.find((a) => a.id === assetId) ?? assets[0]

  if (!active) {
    return (
      <Panel title="3D Model" accent="indigo" className={cn('h-full', className)}>
        <div className="flex h-[320px] items-center justify-center text-sm text-slate-500">
          No SketchUp files registered for this site.
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      title={`${siteName ?? 'Site'} · SketchUp`}
      accent="indigo"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
            .skp
          </span>
          {assets.length > 1 && (
            <select
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-indigo-400"
              value={active.id}
              onChange={(e) => setAssetId(e.target.value)}
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className={cn('layer-chip inline-flex items-center gap-1', autoRotate && 'is-active--amber')}
          >
            <RotateCw
              className={cn('size-3', autoRotate && 'animate-spin')}
              style={{ animationDuration: '2.8s' }}
            />
            Auto-spin
          </button>
          <button
            type="button"
            onClick={() => setFitKey((k) => k + 1)}
            className="layer-chip inline-flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            Reset view
          </button>
        </div>
      }
      className={cn('h-full', className)}
      bodyClassName="flex flex-col gap-2 p-3"
    >
      <p className="text-[11px] text-slate-500">
        {active.label}
        {active.notes ? ` · ${active.notes}` : ''} · first open converts in browser (may take a
        minute)
      </p>
      <div className="model3d-frame model3d-frame--tall relative w-full overflow-hidden bg-[#f3f4f6]">
        <SiteModelCanvas
          key={active.url}
          skpUrl={active.url}
          label={active.label}
          autoRotate={autoRotate}
          fitKey={fitKey}
          performance="balanced"
          active
        />
      </div>
    </Panel>
  )
}

import { useEffect, useState } from 'react'
import { Panel } from '@/shared/ui/Panel'
import {
  driveModelUrlForStage,
  fetchModelIndex,
  pickDefaultStage,
  type ModelStageEntry,
} from '@/features/model3d/modelSource'
import { SiteModelCanvas } from '@/features/model3d/SiteModelCanvas'
import { RotateCcw, RotateCw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type FinalModelViewerProps = {
  title?: string
  compact?: boolean
  className?: string
}

export function FinalModelViewer({
  title = '3D Site Model',
  compact = false,
  className,
}: FinalModelViewerProps) {
  const [autoRotate, setAutoRotate] = useState(false)
  const [fitKey, setFitKey] = useState(0)
  const [stages, setStages] = useState<ModelStageEntry[]>([])
  const [stageId, setStageId] = useState('final')
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let alive = true
    void fetchModelIndex()
      .then((index) => {
        if (!alive) return
        setStages(index.stages ?? [])
        const def = pickDefaultStage(index)
        if (def) setStageId(def.id)
      })
      .catch(() => {
        if (!alive) return
        setLoadFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const active = stages.find((s) => s.id === stageId) ?? stages.find((s) => s.ready)
  const isBlank = Boolean(active?.blank)
  const modelUrl = active && !isBlank ? driveModelUrlForStage(active.id) : null
  const canShow = Boolean(active?.ready && (isBlank || modelUrl))

  return (
    <Panel
      title={title}
      accent="indigo"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className={cn('layer-chip inline-flex items-center gap-1', autoRotate && 'is-active--amber')}
          >
            <RotateCw className={cn('size-3', autoRotate && 'animate-spin')} style={{ animationDuration: '2.8s' }} />
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
      {stages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={!s.ready}
              title={s.ready ? s.label : 'Coming soon'}
              onClick={() => {
                if (!s.ready) return
                setStageId(s.id)
              }}
              className={cn('layer-chip', stageId === s.id && s.ready && 'is-active', !s.ready && 'opacity-40')}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className={cn('model3d-frame', compact ? 'model3d-frame--compact' : 'model3d-frame--tall')}>
        {loadFailed ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
            Unable to load the 3D model right now. Please try again later.
          </div>
        ) : !canShow ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
            This project stage isn’t available yet.
          </div>
        ) : (
          <SiteModelCanvas
            modelUrl={modelUrl}
            blank={isBlank}
            label={active?.label ?? 'site model'}
            autoRotate={autoRotate}
            fitKey={fitKey}
            performance="auto"
            active
          />
        )}
      </div>
    </Panel>
  )
}

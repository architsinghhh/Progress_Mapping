import { useState } from 'react'
import { Box, Columns2, RotateCcw, RotateCw } from 'lucide-react'
import { Panel } from '@/shared/ui/Panel'
import {
  DEMO_MODEL_STAGES,
  DemoSiteModelCanvas,
  type DemoModelStage,
  type DemoSiteKind,
} from '@/features/model3d/DemoSiteModelCanvas'
import { cn } from '@/shared/lib/utils'

type ViewMode = 'single' | 'compare'

function StageChips({
  value,
  onChange,
}: {
  value: DemoModelStage
  onChange: (s: DemoModelStage) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DEMO_MODEL_STAGES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={cn('layer-chip', value === s.id && 'is-active')}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function Frame({
  kind,
  stage,
  autoRotate,
  fitKey,
  tag,
}: {
  kind: DemoSiteKind
  stage: DemoModelStage
  autoRotate: boolean
  fitKey: number
  tag?: string
}) {
  return (
    <div className="model3d-frame model3d-frame--tall relative w-full overflow-hidden bg-[#f3f4f6]">
      <DemoSiteModelCanvas
        key={`${kind}-${stage}-${fitKey}`}
        kind={kind}
        stage={stage}
        autoRotate={autoRotate}
      />
      {tag ? (
        <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white">
          {tag}
        </div>
      ) : null}
    </div>
  )
}

type DemoModelViewerProps = {
  kind: DemoSiteKind
  siteName: string
}

/** Single / compare demo massing for mall & society sites. */
export function DemoModelViewer({ kind, siteName }: DemoModelViewerProps) {
  const [mode, setMode] = useState<ViewMode>('single')
  const [stage, setStage] = useState<DemoModelStage>(2)
  const [thenStage, setThenStage] = useState<DemoModelStage>(0)
  const [nowStage, setNowStage] = useState<DemoModelStage>(2)
  const [autoRotate, setAutoRotate] = useState(false)
  const [fitKey, setFitKey] = useState(0)

  return (
    <div className="flex min-h-[520px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn('layer-chip inline-flex items-center gap-1.5', mode === 'single' && 'is-active')}
          onClick={() => setMode('single')}
        >
          <Box className="size-3.5" />
          Single stage
        </button>
        <button
          type="button"
          className={cn('layer-chip inline-flex items-center gap-1.5', mode === 'compare' && 'is-active')}
          onClick={() => setMode('compare')}
        >
          <Columns2 className="size-3.5" />
          Compare 3D
        </button>
      </div>

      {mode === 'single' ? (
        <Panel
          title={`3D Site Model · ${siteName}`}
          accent="indigo"
          action={
            <div className="flex flex-wrap items-center gap-1.5">
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
          bodyClassName="flex flex-col gap-2 p-3"
        >
          <StageChips value={stage} onChange={setStage} />
          <Frame kind={kind} stage={stage} autoRotate={autoRotate} fitKey={fitKey} />
          <p className="text-[10px] text-slate-400">
            Procedural demo massing · drag to orbit · scroll to zoom
          </p>
        </Panel>
      ) : (
        <Panel
          title={`3D model compare · ${siteName}`}
          accent="indigo"
          action={
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
              <label className="inline-flex items-center gap-2">
                <span className="uppercase tracking-wide text-slate-400">Then</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800"
                  value={thenStage}
                  onChange={(e) => setThenStage(Number(e.target.value) as DemoModelStage)}
                >
                  {DEMO_MODEL_STAGES.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === nowStage}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-2">
                <span className="uppercase tracking-wide text-slate-400">Now</span>
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800"
                  value={nowStage}
                  onChange={(e) => setNowStage(Number(e.target.value) as DemoModelStage)}
                >
                  {DEMO_MODEL_STAGES.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === thenStage}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
          bodyClassName="flex flex-col gap-3 p-3"
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-[11px] font-bold text-slate-700">Then</p>
              <Frame kind={kind} stage={thenStage} autoRotate={false} fitKey={fitKey} tag="Then" />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-[11px] font-bold text-slate-700">Now</p>
              <Frame kind={kind} stage={nowStage} autoRotate={false} fitKey={fitKey + 1} tag="Now" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            Two demo orbit views · each pane independent
          </p>
        </Panel>
      )}
    </div>
  )
}

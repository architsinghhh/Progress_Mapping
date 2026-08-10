import { useEffect, useMemo, useState } from 'react'
import { Box, Columns2 } from 'lucide-react'
import { Panel } from '@/shared/ui/Panel'
import { FinalModelViewer } from '@/features/model3d/FinalModelViewer'
import { DemoModelViewer } from '@/features/model3d/DemoModelViewer'
import { SiteModelCanvas } from '@/features/model3d/SiteModelCanvas'
import {
  driveModelUrlForStage,
  fetchModelIndex,
  type ModelStageEntry,
} from '@/features/model3d/modelSource'
import type { DemoSiteKind } from '@/features/model3d/DemoSiteModelCanvas'
import { cn } from '@/shared/lib/utils'
import { useAppStore } from '@/store/appStore'

type ViewMode = 'single' | 'compare'

function StageSelect({
  label,
  value,
  stages,
  onChange,
  excludeId,
}: {
  label: string
  value: string
  stages: ModelStageEntry[]
  onChange: (id: string) => void
  excludeId?: string
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
      <span className="uppercase tracking-wide text-slate-400">{label}</span>
      <select
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 outline-none focus:border-indigo-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id} disabled={!s.ready || s.id === excludeId}>
            {s.label}
            {!s.ready ? ' (soon)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

function ComparePane({
  stage,
  tag,
}: {
  stage: ModelStageEntry | undefined
  tag: string
}) {
  const blank = Boolean(stage?.blank)
  const url = stage && stage.ready && !blank ? driveModelUrlForStage(stage.id) : null
  const canShow = Boolean(stage?.ready && (blank || url))

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-bold text-slate-700">{tag}</p>
        <p className="text-[10px] text-slate-400">{stage?.label ?? '—'}</p>
      </div>
      <div className="model3d-frame model3d-frame--tall relative w-full overflow-hidden bg-[#f3f4f6]">
        {canShow ? (
          <SiteModelCanvas
            key={`cmp-${stage!.id}`}
            modelUrl={url}
            blank={blank}
            label={stage!.label}
            performance="quality"
            isolateScene={false}
            active
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Stage unavailable
          </div>
        )}
      </div>
    </div>
  )
}

function demoKindFor(type: string | undefined): DemoSiteKind {
  return type === 'society' ? 'society' : 'mall'
}

/** 3D Model tab — Drive GLB for Greenfield; procedural demo massing for other sites. */
export function ModelComparePanel() {
  const project = useAppStore((s) => s.project)
  const hasCapture = Boolean(project?.hasSiteCapture)
  const [mode, setMode] = useState<ViewMode>('single')
  const [stages, setStages] = useState<ModelStageEntry[]>([])
  const [thenId, setThenId] = useState('initial')
  const [nowId, setNowId] = useState('final')

  useEffect(() => {
    if (!hasCapture) return
    let alive = true
    void fetchModelIndex()
      .then((index) => {
        if (!alive) return
        const list = (index.stages ?? []).filter((s) => s.ready)
        setStages(index.stages ?? [])
        if (list.length >= 2) {
          setThenId(list[0].id)
          setNowId(list[list.length - 1].id)
        } else if (list[0]) {
          setThenId(list[0].id)
          setNowId(list[0].id)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [hasCapture])

  const readyStages = useMemo(() => stages.filter((s) => s.ready), [stages])
  const thenStage = stages.find((s) => s.id === thenId)
  const nowStage = stages.find((s) => s.id === nowId)

  const setThen = (id: string) => {
    setThenId(id)
    if (id === nowId) {
      const other = readyStages.find((s) => s.id !== id)
      if (other) setNowId(other.id)
    }
  }
  const setNow = (id: string) => {
    setNowId(id)
    if (id === thenId) {
      const other = readyStages.find((s) => s.id !== id)
      if (other) setThenId(other.id)
    }
  }

  if (!hasCapture) {
    return (
      <DemoModelViewer
        kind={demoKindFor(project?.type)}
        siteName={project?.name ?? 'Demo site'}
      />
    )
  }

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
        <FinalModelViewer title="3D Site Model" />
      ) : (
        <Panel
          title="3D model compare"
          accent="indigo"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <StageSelect
                label="Then"
                value={thenId}
                stages={stages}
                onChange={setThen}
                excludeId={nowId}
              />
              <StageSelect
                label="Now"
                value={nowId}
                stages={stages}
                onChange={setNow}
                excludeId={thenId}
              />
            </div>
          }
          bodyClassName="flex flex-col gap-3 p-3"
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ComparePane stage={thenStage} tag="Then" />
            <ComparePane stage={nowStage} tag="Now" />
          </div>
          <p className="text-[10px] text-slate-400">
            Two independent orbit views · drag / scroll each pane separately
          </p>
        </Panel>
      )}
    </div>
  )
}

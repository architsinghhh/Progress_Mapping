import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Undo2, Trash2, Download, Copy, Save, RotateCcw, Plus } from 'lucide-react'
import { OrthoZoneMap, type OrthoZoneLayer } from '@/features/site-plan/OrthoZoneMap'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'
import {
  clearSavedFootprints,
  footprintsToTsModule,
  getActiveFootprints,
  saveFootprints,
  withChunks,
  readyChunks,
  chunkCount,
  isFootprintReady,
  type ZoneFootprint,
  type Point2,
} from '@/features/site-plan/zoneFootprints'

type ZoneTraceEditorProps = {
  open: boolean
  onClose: () => void
  stageId?: string
}

export function ZoneTraceEditor({ open, onClose, stageId = 'final' }: ZoneTraceEditorProps) {
  const zones = useAppStore((s) => s.zones)
  const [drafts, setDrafts] = useState<ZoneFootprint[]>(() => getActiveFootprints())
  const [activeZoneId, setActiveZoneId] = useState(zones[0]?.id ?? 'zone_a')
  const [activeChunkIdx, setActiveChunkIdx] = useState(0)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const next = getActiveFootprints()
    setDrafts(next)
    const zid = zones[0]?.id ?? 'zone_a'
    setActiveZoneId(zid)
    const fp = next.find((f) => f.zoneId === zid)
    setActiveChunkIdx(Math.max(0, (fp?.chunks.length ?? 1) - 1))
  }, [open, zones])

  const active = drafts.find((d) => d.zoneId === activeZoneId)
  const activeZone = zones.find((z) => z.id === activeZoneId)
  const activeChunk: Point2[] = active?.chunks[activeChunkIdx] ?? []

  const setZoneChunks = useCallback((zoneId: string, chunks: Point2[][]) => {
    setDrafts((prev) => {
      const next = prev.map((f) => (f.zoneId === zoneId ? withChunks(zoneId, chunks) : f))
      if (!next.some((f) => f.zoneId === zoneId)) next.push(withChunks(zoneId, chunks))
      return next
    })
  }, [])

  const updateActiveChunk = (points: Point2[]) => {
    if (!active) return
    const chunks = active.chunks.map((c, i) => (i === activeChunkIdx ? points : c))
    if (chunks.every((c) => c.length > 0)) chunks.push([])
    setZoneChunks(activeZoneId, chunks)
  }

  const onMapClick = (uv: Point2) => {
    updateActiveChunk([...(activeChunk ?? []), uv])
    setStatus(null)
  }

  const overlayZones: OrthoZoneLayer[] = useMemo(
    () =>
      drafts.map((f) => {
        const z = zones.find((x) => x.id === f.zoneId)
        return {
          id: f.zoneId,
          color: z?.color ?? '#94a3b8',
          chunks: readyChunks(f),
          active: f.zoneId === activeZoneId,
          label: z ? `${z.code} · ${z.name}` : f.zoneId,
          labelAt: [f.labelAt.x, f.labelAt.y],
        }
      }),
    [drafts, zones, activeZoneId],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950/95 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="font-display text-sm font-bold">Trace zone outlines</p>
          <p className="text-[10px] text-white/55">
            Same still as Overview · scroll zoom · drag pan · click to place points
          </p>
        </div>
        <button type="button" className="rounded-lg bg-white/10 p-2 hover:bg-white/20" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-2 overflow-auto lg:w-64">
          <p className="text-[10px] font-bold tracking-wide text-white/40 uppercase">Component</p>
          <div className="flex flex-wrap gap-1.5 lg:flex-col">
            {zones.map((z) => {
              const fp = drafts.find((d) => d.zoneId === z.id)
              const ready = fp ? isFootprintReady(fp) : false
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => {
                    setActiveZoneId(z.id)
                    const f = drafts.find((d) => d.zoneId === z.id)
                    setActiveChunkIdx(Math.max(0, (f?.chunks.length ?? 1) - 1))
                  }}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-left text-xs font-semibold',
                    activeZoneId === z.id
                      ? 'border-white/30 bg-white/10'
                      : 'border-transparent bg-white/5 hover:bg-white/8',
                  )}
                >
                  <span className="font-bold" style={{ color: z.color }}>
                    {z.code}
                  </span>{' '}
                  {z.name}
                  <span className="mt-0.5 block text-[10px] font-medium text-white/45">
                    {ready ? `${chunkCount(fp!)} pad(s)` : 'empty'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-[11px] font-semibold hover:bg-white/15"
              onClick={() => activeChunk.length && updateActiveChunk(activeChunk.slice(0, -1))}
            >
              <Undo2 className="size-3.5" /> Undo pt
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-[11px] font-semibold hover:bg-white/15"
              onClick={() => updateActiveChunk([])}
            >
              <Trash2 className="size-3.5" /> Clear chunk
            </button>
            <button
              type="button"
              className="col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-[11px] font-semibold hover:bg-white/15"
              onClick={() => {
                if (!active) return
                const solid = readyChunks(active)
                setZoneChunks(activeZoneId, [...solid, []])
                setActiveChunkIdx(solid.length)
              }}
            >
              <Plus className="size-3.5" /> New pad / chunk
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-1.5 pt-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-white hover:bg-sky-400"
              onClick={() => {
                saveFootprints(drafts)
                setStatus('Saved · Overview uses this exact map')
              }}
            >
              <Save className="size-3.5" /> Save traces
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
              onClick={async () => {
                await navigator.clipboard.writeText(footprintsToTsModule(drafts))
                setStatus('Copied TypeScript')
              }}
            >
              <Copy className="size-3.5" /> Copy as TypeScript
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
              onClick={() => {
                const blob = new Blob([JSON.stringify(drafts, null, 2)], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'greenfield-zone-footprints.json'
                a.click()
                URL.revokeObjectURL(a.href)
              }}
            >
              <Download className="size-3.5" /> Download JSON
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
              onClick={() => {
                clearSavedFootprints()
                setDrafts(getActiveFootprints())
                setStatus('Cleared')
              }}
            >
              <RotateCcw className="size-3.5" /> Reset saved
            </button>
            {status && <p className="text-[10px] leading-snug text-emerald-300/90">{status}</p>}
          </div>
        </aside>

        <div className="relative min-h-[320px] min-w-0 flex-1 overflow-hidden rounded-xl border border-white/10">
          <OrthoZoneMap
            stageId={stageId}
            label="Stage 6 · trace"
            className="absolute inset-0"
            zones={overlayZones}
            draftPoints={activeChunk}
            onMapClick={onMapClick}
            pickMode
          />
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md bg-slate-950/75 px-2.5 py-1.5 text-[11px] font-semibold text-white/90">
            {activeZone?.code} {activeZone?.name} · chunk #{activeChunkIdx + 1} · {activeChunk.length}{' '}
            pts
          </div>
        </div>
      </div>
    </div>
  )
}

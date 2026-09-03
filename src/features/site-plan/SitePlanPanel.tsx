import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import { Maximize2, PenLine, X } from 'lucide-react'
import { OrthoZoneMap, type OrthoZoneLayer } from '@/features/site-plan/OrthoZoneMap'
import { MockSitePlanMap } from '@/features/site-plan/MockSitePlanMap'
import { modelStageForMission } from '@/entities/constructionStages'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  getActiveFootprints,
  hasTracedFootprints,
  readyChunks,
  isFootprintReady,
  type ZoneFootprint,
} from '@/features/site-plan/zoneFootprints'
import { ZoneTraceEditor } from '@/features/site-plan/ZoneTraceEditor'
import { WorkRemarkField } from '@/shared/ui/WorkRemarkField'
import { zoneRemarkKey } from '@/shared/lib/workRemarks'

function useFootprints(): ZoneFootprint[] {
  const [fps, setFps] = useState(() => getActiveFootprints())
  useEffect(() => {
    const sync = () => setFps(getActiveFootprints())
    window.addEventListener('pm:zone-footprints-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('pm:zone-footprints-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return fps
}

/** Overview: nadir still + SVG zones on one zoom/pan layer (cannot drift). */
export function SitePlanPanel() {
  const project = useAppStore((s) => s.project)
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const selectZone = useAppStore((s) => s.selectZone)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const missions = useAppStore((s) => s.missions)
  const pulseCriticalPath = useAppStore((s) => s.pulseCriticalPath)
  const whatIfActive = useAppStore((s) => s.whatIfActive)
  const orthoFullscreen = useAppStore((s) => s.orthoFullscreen)
  const setOrthoFullscreen = useAppStore((s) => s.setOrthoFullscreen)
  const showZones = useAppStore((s) => s.activeLayers.includes('zoning'))
  const toggleLayer = useAppStore((s) => s.toggleLayer)

  const hasCapture = Boolean(project?.hasSiteCapture)
  const mockTone = project?.type === 'mall' ? 'mall' : project?.type === 'society' ? 'society' : 'default'

  const footprints = useFootprints()
  const [traceOpen, setTraceOpen] = useState(false)
  const [toastDismissed, setToastDismissed] = useState(false)
  const traced = hasTracedFootprints()
  const showNoZonesToast = hasCapture && !traced && !toastDismissed

  useEffect(() => {
    if (traced) setToastDismissed(false)
  }, [traced])

  useEffect(() => {
    if (!orthoFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOrthoFullscreen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [orthoFullscreen, setOrthoFullscreen])

  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaledZones = zones.map((z) => {
    const s = scaleZoneForMission(z, factor)
    if (whatIfActive && z.id === 'zone_a') {
      return {
        ...s,
        overallProgress: Math.min(100, s.overallProgress + 4),
      }
    }
    if (whatIfActive && z.id === 'zone_b') {
      return { ...s, overallProgress: Math.max(0, s.overallProgress - 2) }
    }
    return s
  })

  const mission = missions[activeMissionIndex]
  const orthoStageId = modelStageForMission(activeMissionIndex, mission?.modelStageId)
  const selectedZone = scaledZones.find((z) => z.id === selectedZoneId)
  const fpFor = (id: string) => footprints.find((f) => f.zoneId === id)

  const zoneLayers: OrthoZoneLayer[] = useMemo(() => {
    if (!showZones || !hasCapture) return []
    return scaledZones.flatMap((zone) => {
      const fp = fpFor(zone.id)
      if (!fp || !isFootprintReady(fp)) return []
      const chunks = readyChunks(fp)
      const critical =
        pulseCriticalPath && zone.scheduleStatus === 'behind'
      return [
        {
          id: zone.id,
          color: critical ? '#dc2626' : zone.color,
          chunks,
          active: zone.id === selectedZoneId,
          label: `${zone.code} · ${zone.name}`,
          labelAt: [fp.labelAt.x, fp.labelAt.y],
        },
      ]
    })
  }, [showZones, hasCapture, scaledZones, footprints, selectedZoneId, pulseCriticalPath])

  const componentLabel =
    project?.type === 'mall'
      ? 'Mall zones'
      : project?.type === 'society'
        ? 'Society zones'
        : 'Township components'

  const mapBody = hasCapture ? (
    <OrthoZoneMap
      stageId={orthoStageId}
      label={`Top view · ${mission?.label ?? orthoStageId}`}
      zones={zoneLayers}
    />
  ) : (
    <MockSitePlanMap
      zones={scaledZones}
      selectedZoneId={selectedZoneId}
      onSelect={(id) => {
        if (!showZones) toggleLayer('zoning')
        void selectZone(id)
      }}
      showZones={showZones}
      label={mission?.label ?? project?.name ?? 'Demo'}
      tone={mockTone}
    />
  )

  return (
    <Panel
      title={hasCapture ? 'Top view ortho · Zones' : 'Mock site plan · Zones'}
      accent="sky"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn('layer-chip', showZones && 'is-active')}
            onClick={() => toggleLayer('zoning')}
          >
            Zones {showZones ? 'on' : 'off'}
          </button>
          <button
            type="button"
            className="layer-chip inline-flex items-center gap-1"
            onClick={() => setOrthoFullscreen(true)}
          >
            <Maximize2 className="size-3" />
            Fullscreen
          </button>
        </div>
      }
      className="h-full"
      bodyClassName="relative flex h-full min-h-0 flex-col gap-0 p-3"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <div
        className={cn(
          'viz-frame site-plan-frame relative min-h-[420px] w-full overflow-hidden lg:min-h-0 lg:h-full',
          pulseCriticalPath && 'viz-frame--pulse',
        )}
      >
        <div className="absolute inset-0">{mapBody}</div>

        <div className="viz-caption">
          <span>
            {hasCapture
              ? 'Top-down ortho · scroll zoom · drag pan'
              : 'Demo mock plan · click a zone · not Greenfield GLB'}
          </span>
          <span>● Scrub timeline to change survey stage</span>
        </div>

        <AnimatePresence>
          {showNoZonesToast && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute bottom-14 left-3 right-3 z-30 flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm sm:left-auto sm:right-3 sm:max-w-[280px]"
            >
              <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-600">
                No zones outlined yet. Use Edit outlines — Overview and tracer share the same map.
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setToastDismissed(true)}
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-h-0 w-full flex-col overflow-hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
            {componentLabel}
          </p>
          <div className="flex items-center gap-2">
            {selectedZone && (
              <span className="hidden text-[10px] font-semibold text-slate-500 sm:inline">
                Selected · {selectedZone.name}
              </span>
            )}
            {hasCapture && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 transition hover:text-slate-600"
                onClick={() => setTraceOpen(true)}
                title="Edit zone outlines"
              >
                <PenLine className="size-3 opacity-70" />
                Edit outlines
              </button>
            )}
          </div>
        </div>
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto pr-0.5">
          {scaledZones.map((zone) => {
            const active = zone.id === selectedZoneId
            const fp = fpFor(zone.id)
            const ready = hasCapture && fp ? isFootprintReady(fp) : false
            const pads = hasCapture && fp ? readyChunks(fp).length : 0
            return (
              <div key={zone.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!showZones) toggleLayer('zoning')
                    void selectZone(zone.id)
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition',
                    active
                      ? 'border-slate-300 bg-white shadow-sm'
                      : 'border-transparent bg-slate-50/90 hover:border-slate-200 hover:bg-white',
                  )}
                  style={active ? { boxShadow: `inset 3px 0 0 ${zone.color}` } : undefined}
                >
                  <span
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white"
                    style={{ background: zone.color }}
                  >
                    {zone.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px] font-bold text-slate-800">{zone.name}</span>
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                        {zone.overallProgress}%
                      </span>
                    </span>
                    <span className="mt-1 block">
                      <StatusBadge status={zone.scheduleStatus} compact />
                    </span>
                    {ready ? (
                      <span className="mt-0.5 block text-[9px] font-medium text-slate-400">
                        {pads} pad{pads === 1 ? '' : 's'} on map
                      </span>
                    ) : null}
                  </span>
                </button>
                {active ? (
                  <WorkRemarkField
                    remarkKey={zoneRemarkKey(zone.id)}
                    fallback={zone.remark}
                    placeholder="Add zone remark…"
                    compact
                    tone={
                      zone.scheduleStatus === 'behind'
                        ? 'behind'
                        : zone.scheduleStatus === 'ahead'
                          ? 'ahead'
                          : 'default'
                    }
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      </div>

      {hasCapture && (
        <ZoneTraceEditor open={traceOpen} onClose={() => setTraceOpen(false)} stageId="final" />
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {orthoFullscreen && (
              <motion.div
                key="ortho-fs"
                role="dialog"
                aria-modal
                aria-label={hasCapture ? 'Fullscreen top view ortho' : 'Fullscreen mock site plan'}
                className="fixed inset-0 z-[200] flex flex-col bg-slate-950"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
                  <div>
                    <p className="font-display text-sm font-bold">
                      {hasCapture ? 'Top view ortho' : 'Mock site plan'} · {mission?.label}
                    </p>
                    <p className="text-[10px] text-white/60">
                      {hasCapture ? 'Scroll zoom · drag pan · Escape to exit' : 'Escape to exit'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
                    onClick={() => setOrthoFullscreen(false)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="relative min-h-0 flex-1 p-3 sm:p-5">
                  <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#d6d0c2]">
                    {hasCapture ? (
                      <OrthoZoneMap
                        stageId={orthoStageId}
                        label={`Top view · ${mission?.label ?? ''}`}
                        zones={zoneLayers}
                        frame="contain"
                        className="absolute inset-0"
                      />
                    ) : (
                      <MockSitePlanMap
                        zones={scaledZones}
                        selectedZoneId={selectedZoneId}
                        onSelect={(id) => void selectZone(id)}
                        showZones={showZones}
                        label={mission?.label ?? project?.name ?? 'Demo'}
                        tone={mockTone}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </Panel>
  )
}

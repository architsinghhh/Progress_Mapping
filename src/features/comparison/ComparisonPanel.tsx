import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Columns2, SplitSquareHorizontal } from 'lucide-react'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'
import type { ComparisonMode } from '@/store/appStore'
import {
  DemSurveyScene,
  MallOrthoScene,
  OrthoSurveyScene,
  SocietyOrthoScene,
} from '@/features/comparison/SurveyVisuals'
import { OrthoCompareSideBySide, OrthoCompareSlider } from '@/features/comparison/OrthoComparePair'
import { DemCompareSideBySide, DemCompareSlider } from '@/features/comparison/DemComparePair'
import { demUrlForMission } from '@/features/comparison/demSource'
import { modelStageForMission } from '@/entities/constructionStages'
import { AerialMetaBar } from '@/shared/ui/AerialMetaBar'
import { formatMonthYear, statusLabel } from '@/shared/lib/utils'
import type { Project } from '@/entities/types'

type SurveyMode = Exclude<ComparisonMode, 'floor'>
type ViewLayout = 'slider' | 'side'
type SiteKind = Project['type']

const modes: { id: SurveyMode; label: string }[] = [
  { id: 'ortho', label: 'Ortho' },
  { id: 'dem', label: 'DEM' },
]

function missionVariant(missionIndex: number): 'before' | 'after' {
  return missionIndex <= 0 ? 'before' : 'after'
}

function MockOrtho({
  siteKind,
  variant,
  missionIndex,
}: {
  siteKind: SiteKind
  variant: 'before' | 'after'
  missionIndex: number
}) {
  if (siteKind === 'mall') return <MallOrthoScene variant={variant} missionIndex={missionIndex} />
  if (siteKind === 'society') return <SocietyOrthoScene variant={variant} missionIndex={missionIndex} />
  return <OrthoSurveyScene variant={variant} missionIndex={missionIndex} />
}

function Scene({
  kind,
  missionIndex = 5,
  siteKind = 'township',
  useMockOrtho = false,
}: {
  kind: SurveyMode
  missionIndex?: number
  modelStageId?: string
  siteKind?: SiteKind
  useMockOrtho?: boolean
}) {
  const variant = missionVariant(missionIndex)
  if (kind === 'dem') return <DemSurveyScene variant={variant} missionIndex={missionIndex} />
  if (useMockOrtho) return <MockOrtho siteKind={siteKind} variant={variant} missionIndex={missionIndex} />
  return null
}

function ScenePane({
  kind,
  missionIndex,
  label,
  modelStageId,
  siteKind,
  useMockOrtho,
}: {
  kind: SurveyMode
  missionIndex: number
  label: string
  modelStageId?: string
  siteKind: SiteKind
  useMockOrtho: boolean
}) {
  return (
    <div className="compare-frame compare-frame--static relative min-h-[420px] flex-1 overflow-hidden bg-[#d6d0c2]">
      <Scene
        kind={kind}
        missionIndex={missionIndex}
        modelStageId={modelStageId}
        siteKind={siteKind}
        useMockOrtho={useMockOrtho}
      />
      <div className="compare-tag left-2">{label}</div>
    </div>
  )
}

export function ComparisonPanel() {
  const project = useAppStore((s) => s.project)
  const comparisonMode = useAppStore((s) => s.comparisonMode)
  const setComparisonMode = useAppStore((s) => s.setComparisonMode)
  const sliderPosition = useAppStore((s) => s.sliderPosition)
  const setSliderPosition = useAppStore((s) => s.setSliderPosition)
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const missions = useAppStore((s) => s.missions)
  const compareThenIndex = useAppStore((s) => s.compareThenIndex)
  const compareNowIndex = useAppStore((s) => s.compareNowIndex)
  const setCompareThenIndex = useAppStore((s) => s.setCompareThenIndex)
  const setCompareNowIndex = useAppStore((s) => s.setCompareNowIndex)
  const zone = zones.find((z) => z.id === selectedZoneId)
  const thenMission = missions[compareThenIndex]
  const nowMission = missions[compareNowIndex]
  const deltaDays =
    thenMission && nowMission ? Math.max(0, nowMission.dayOffset - thenMission.dayOffset) : 0
  const hasCapture = Boolean(project?.hasSiteCapture)
  const siteKind: SiteKind = project?.type ?? 'township'
  const useMockOrtho = !hasCapture
  const thenDemSrc = demUrlForMission({
    missionIndex: compareThenIndex,
    modelStageId: thenMission?.modelStageId,
  })
  const nowDemSrc = demUrlForMission({
    missionIndex: compareNowIndex,
    modelStageId: nowMission?.modelStageId,
  })

  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [viewLayout, setViewLayout] = useState<ViewLayout>('slider')

  // Floor-wise lives on Progress now — bounce stale mode back to ortho
  useEffect(() => {
    if (comparisonMode === 'floor') setComparisonMode('ortho')
  }, [comparisonMode, setComparisonMode])

  const surveyMode: SurveyMode = comparisonMode === 'dem' ? 'dem' : 'ortho'
  const useDemStills = hasCapture && surveyMode === 'dem'

  const labels = useMemo(() => {
    const thenL = thenMission?.label ?? 'Then'
    const nowL = nowMission?.label ?? 'Now'
    if (surveyMode === 'dem') return { before: `DEM | ${thenL}`, after: `DEM | ${nowL}` }
    return { before: `Ortho | ${thenL}`, after: `Ortho | ${nowL}` }
  }, [surveyMode, thenMission?.label, nowMission?.label])

  const onPointer = (e: ReactPointerEvent) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setSliderPosition(Math.min(98, Math.max(2, pct)))
  }

  const changeCues =
    surveyMode === 'ortho' && compareNowIndex > compareThenIndex
      ? siteKind === 'mall'
        ? [
            compareNowIndex >= 1 ? 'Basements / helix ramp visible' : null,
            compareNowIndex >= 2 ? 'Atrium spiral + koi void' : null,
            compareNowIndex >= 3 ? 'IMAX box · wall plumb check' : null,
            compareNowIndex >= 4 ? 'Rooftop Fun Zone still gravel' : null,
          ].filter(Boolean)
        : siteKind === 'society'
          ? [
              compareNowIndex >= 1 ? 'Twin rafts / Wing A rise' : null,
              compareNowIndex >= 2 ? 'Club lagoon shell' : null,
              compareNowIndex >= 3 ? 'Wing B pad sink · recovery' : null,
            ].filter(Boolean)
          : [
              compareNowIndex >= 1 ? 'Structural base / foundations visible' : null,
              compareNowIndex >= 2 ? 'Residential rise · commercial activity' : null,
              compareNowIndex >= 4 ? 'Amenity / open-space initiation' : null,
              compareNowIndex >= 6 ? 'Stage 6 handover massing' : null,
            ].filter(Boolean)
      : []

  return (
    <Panel
      title="Then / Now Comparison · Survey Viewer"
      accent="coral"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="chip-row">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setComparisonMode(m.id)}
                className={cn('layer-chip', surveyMode === m.id && 'is-active--amber')}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="chip-row">
            <button
              type="button"
              onClick={() => setViewLayout('slider')}
              className={cn(
                'layer-chip inline-flex items-center gap-1',
                viewLayout === 'slider' && 'is-active',
              )}
            >
              <SplitSquareHorizontal className="size-3" />
              Slider
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('side')}
              className={cn(
                'layer-chip inline-flex items-center gap-1',
                viewLayout === 'side' && 'is-active',
              )}
            >
              <Columns2 className="size-3" />
              Side-by-side
            </button>
          </div>
        </div>
      }
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">
            <span className="font-display font-bold text-slate-800">{zone?.name ?? 'Zone'}</span>
            <span className="mx-1.5">|</span>
            <span>
              {zone?.overallProgress ?? 0}% onsite · {zone ? statusLabel(zone.scheduleStatus) : '—'}
              {zone?.scheduleStatus === 'behind' && (
                <span className="ml-1.5 font-medium text-red-600">
                  · {zone.remark?.trim() || 'Behind schedule — check forecast'}
                </span>
              )}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              Then
              <select
                className="ml-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                value={compareThenIndex}
                onChange={(e) => setCompareThenIndex(Number(e.target.value))}
              >
                {missions.map((m, i) => (
                  <option key={m.id} value={i} disabled={i >= compareNowIndex && missions.length > 1}>
                    {m.label} · {formatMonthYear(m.date)}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-slate-300">→</span>
            <label className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              Now
              <select
                className="ml-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                value={compareNowIndex}
                onChange={(e) => setCompareNowIndex(Number(e.target.value))}
              >
                {missions.map((m, i) => (
                  <option key={m.id} value={i} disabled={i <= compareThenIndex && missions.length > 1}>
                    {m.label} · {formatMonthYear(m.date)}
                  </option>
                ))}
              </select>
            </label>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
              {deltaDays}d apart
            </span>
          </div>
        </div>
        <AerialMetaBar mission={nowMission} tone="light" />
      </div>

      {changeCues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold tracking-wide text-amber-700/80 uppercase">
            Change cues
          </span>
          {changeCues.map((c) => (
            <span
              key={String(c)}
              className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {surveyMode === 'ortho' && viewLayout === 'side' && hasCapture ? (
        <OrthoCompareSideBySide
          thenStageId={modelStageForMission(compareThenIndex, thenMission?.modelStageId)}
          nowStageId={modelStageForMission(compareNowIndex, nowMission?.modelStageId)}
          thenLabel={labels.before}
          nowLabel={labels.after}
        />
      ) : useDemStills && viewLayout === 'side' ? (
        <DemCompareSideBySide
          thenSrc={thenDemSrc}
          nowSrc={nowDemSrc}
          thenLabel={labels.before}
          nowLabel={labels.after}
        />
      ) : viewLayout === 'side' ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <ScenePane
            kind={surveyMode}
            missionIndex={compareThenIndex}
            label={labels.before}
            modelStageId={thenMission?.modelStageId}
            siteKind={siteKind}
            useMockOrtho={useMockOrtho || surveyMode === 'ortho'}
          />
          <ScenePane
            kind={surveyMode}
            missionIndex={compareNowIndex}
            label={`${labels.after} | ${nowMission?.label ?? 'Now'}`}
            modelStageId={nowMission?.modelStageId}
            siteKind={siteKind}
            useMockOrtho={useMockOrtho || surveyMode === 'ortho'}
          />
        </div>
      ) : (
        <div
          ref={trackRef}
          className="compare-frame min-h-[480px] flex-1"
          onPointerDown={(e) => {
            setDragging(true)
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            onPointer(e)
          }}
          onPointerMove={(e) => {
            if (dragging || e.buttons === 1) onPointer(e)
          }}
          onPointerUp={() => setDragging(false)}
        >
          {surveyMode === 'ortho' && hasCapture ? (
            <OrthoCompareSlider
              thenStageId={modelStageForMission(compareThenIndex, thenMission?.modelStageId)}
              nowStageId={modelStageForMission(compareNowIndex, nowMission?.modelStageId)}
              sliderPosition={sliderPosition}
            />
          ) : useDemStills ? (
            <DemCompareSlider
              thenSrc={thenDemSrc}
              nowSrc={nowDemSrc}
              sliderPosition={sliderPosition}
            />
          ) : (
            <>
              <Scene
                kind={surveyMode}
                missionIndex={compareNowIndex}
                modelStageId={nowMission?.modelStageId}
                siteKind={siteKind}
                useMockOrtho={useMockOrtho || surveyMode === 'ortho'}
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <Scene
                  kind={surveyMode}
                  missionIndex={compareThenIndex}
                  modelStageId={thenMission?.modelStageId}
                  siteKind={siteKind}
                  useMockOrtho={useMockOrtho || surveyMode === 'ortho'}
                />
              </div>
            </>
          )}

          <div className="compare-handle" style={{ left: `${sliderPosition}%` }}>
            <div className="compare-knob">{'<>'}</div>
          </div>

          <div className="compare-tag left-2">{labels.before}</div>
          <div className="compare-tag right-2">{labels.after}</div>

          <div className="absolute right-3 bottom-14 z-30 max-w-[70%]">
            <AerialMetaBar mission={nowMission} />
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between text-[11px] font-semibold text-white/90">
            <span className="rounded-md bg-slate-900/55 px-2.5 py-1.5 backdrop-blur">
              {thenMission?.label} → {nowMission?.label}
            </span>
            <span className="rounded-md bg-slate-900/55 px-2.5 py-1.5 backdrop-blur">
              {hasCapture
                ? surveyMode === 'dem'
                  ? 'DEM stills · drag slider'
                  : 'Drag slider · any mission pair'
                : 'Mock ortho · demo site (no GLB)'}
            </span>
          </div>
        </div>
      )}
    </Panel>
  )
}

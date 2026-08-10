import { Panel } from '@/shared/ui/Panel'
import { CONSTRUCTION_STAGES } from '@/entities/constructionStages'
import { cn } from '@/shared/lib/utils'
import { useAppStore } from '@/store/appStore'

const COMP_LABEL: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  open_spaces: 'Open Spaces',
  amenities: 'Amenities',
  club_house: 'Club House',
}

const MALL_GANTT = [
  { id: 'retail', label: 'Retail / Hyper', color: '#ea580c', start: 1, end: 5 },
  { id: 'atrium', label: 'Atrium F&B', color: '#b45309', start: 2, end: 5 },
  { id: 'cinema', label: 'IMAX / Cinema', color: '#c2410c', start: 3, end: 6 },
  { id: 'park', label: 'Basement park', color: '#9a3412', start: 1, end: 4 },
  { id: 'fun', label: 'Rooftop Fun', color: '#f59e0b', start: 5, end: 6 },
]

const SOCIETY_GANTT = [
  { id: 'wa', label: 'Wing A', color: '#059669', start: 1, end: 6 },
  { id: 'wb', label: 'Wing B', color: '#047857', start: 1, end: 6 },
  { id: 'club', label: 'Club / Lagoon', color: '#10b981', start: 3, end: 5 },
  { id: 'ev', label: 'EV Podium', color: '#34d399', start: 4, end: 6 },
]

const TOWNSHIP_GANTT = [
  { id: 'res', label: 'Residential', color: '#0ea5e9', start: 1, end: 6 },
  { id: 'com', label: 'Commercial', color: '#d97706', start: 3, end: 4 },
  { id: 'open', label: 'Open Spaces', color: '#7c3aed', start: 5, end: 6 },
  { id: 'amn', label: 'Amenities', color: '#dc2626', start: 5, end: 6 },
  { id: 'club', label: 'Club House', color: '#059669', start: 5, end: 6 },
]

export function StageMatrixPanel() {
  const project = useAppStore((s) => s.project)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const currentStage = missions[activeMissionIndex]?.constructionStage ?? 6

  if (project?.type === 'mall') {
    return (
      <Panel
        title="Stage matrix · Mall packages"
        accent="indigo"
        action={
          <span className="text-[10px] font-medium text-slate-400">
            Demo packages · survey index {activeMissionIndex + 1}/{missions.length}
          </span>
        }
        bodyClassName="overflow-auto p-0"
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
              <th className="px-3 py-2.5">Package</th>
              <th className="px-3 py-2.5">Status story</th>
              <th className="px-3 py-2.5">Wild card</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Hypermarket', 'Shell handed to tenant', 'Showcase zone — actually done'],
              ['Atrium spiral', 'Steel closed · glass packing', 'Heritage Koi Court (accidental)'],
              ['IMAX wing', 'Screen wall redo mid-flight', '11° off plumb — night crews'],
              ['Triple basement', 'Dewatering stable', 'B3 monsoon lake episode'],
              ['Rooftop Fun Zone', '18% · gravel moonscape', 'Ferris-lite foundations = sketch'],
            ].map(([pkg, status, wild]) => (
              <tr key={pkg} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2.5 font-display text-xs font-bold text-slate-800">{pkg}</td>
                <td className="px-3 py-2.5 text-slate-600">{status}</td>
                <td className="px-3 py-2.5 font-semibold text-amber-800">{wild}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    )
  }

  if (project?.type === 'society') {
    return (
      <Panel
        title="Stage matrix · Society towers"
        accent="indigo"
        action={
          <span className="text-[10px] font-medium text-slate-400">
            Demo towers · survey index {activeMissionIndex + 1}/{missions.length}
          </span>
        }
        bodyClassName="overflow-auto p-0"
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
              <th className="px-3 py-2.5">Block</th>
              <th className="px-3 py-2.5">Status story</th>
              <th className="px-3 py-2.5">Wild card</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Tower North', '~49% · L6 slabs', 'Monsoon catch-up running'],
              ['Tower South', '~22% · pad rebuild', 'Crane pad sank ~40 cm'],
              ['Club & Lagoon', 'On track shell', 'Pink infinity pool forms'],
              ['Podium EV Forest', '14% · almost bare', 'OC wants +47 EV points'],
            ].map(([pkg, status, wild]) => (
              <tr key={pkg} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2.5 font-display text-xs font-bold text-slate-800">{pkg}</td>
                <td className="px-3 py-2.5 text-slate-600">{status}</td>
                <td className="px-3 py-2.5 font-semibold text-emerald-800">{wild}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    )
  }

  return (
    <Panel
      title="Stage matrix · Township components"
      accent="indigo"
      action={
        <span className="text-[10px] font-medium text-slate-400">
          Doc Stages 1–6 · survey at Stage {currentStage}
        </span>
      }
      bodyClassName="overflow-auto p-0"
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
            <th className="px-3 py-2.5">Stage</th>
            <th className="px-3 py-2.5">Residential</th>
            <th className="px-3 py-2.5">Commercial</th>
            <th className="px-3 py-2.5">Open / Amenities / Club</th>
            <th className="px-3 py-2.5">Key milestone</th>
          </tr>
        </thead>
        <tbody>
          {CONSTRUCTION_STAGES.map((s) => {
            const active = s.id === currentStage
            const done = s.id < currentStage
            return (
              <tr
                key={s.id}
                className={cn(
                  'border-b border-slate-100 align-top',
                  active && 'bg-sky-50/80',
                  done && 'bg-emerald-50/40',
                )}
              >
                <td className="px-3 py-2.5">
                  <div className="font-display text-xs font-bold text-slate-800">
                    {s.shortLabel}
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-slate-500">{s.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.primaryComponents.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 ring-1 ring-slate-200"
                      >
                        {COMP_LABEL[c]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{s.residentialMilestone}</td>
                <td className="px-3 py-2.5 text-slate-600">{s.commercialMilestone}</td>
                <td className="px-3 py-2.5 text-slate-600">{s.amenityMilestone}</td>
                <td className="px-3 py-2.5 font-semibold text-slate-800">{s.keyMilestone}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
        {CONSTRUCTION_STAGES.find((s) => s.id === currentStage)?.droneObjective}
      </p>
    </Panel>
  )
}

/** Simple component Gantt across stages. */
export function StageGanttPanel() {
  const project = useAppStore((s) => s.project)
  const rows =
    project?.type === 'mall'
      ? MALL_GANTT
      : project?.type === 'society'
        ? SOCIETY_GANTT
        : TOWNSHIP_GANTT
  const colCount = 6
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const currentStage = missions[activeMissionIndex]?.constructionStage ?? Math.min(6, activeMissionIndex + 1)

  return (
    <Panel
      title={
        project?.type === 'mall'
          ? 'Schedule · Mall Gantt'
          : project?.type === 'society'
            ? 'Schedule · Society Gantt'
            : 'Schedule · Component Gantt'
      }
      accent="gold"
      action={<span className="text-[10px] font-medium text-slate-400">Illustrative bars</span>}
      bodyClassName="flex flex-col gap-3 p-3"
    >
      <div
        className="grid gap-1 px-[7.5rem] text-center text-[9px] font-bold tracking-wide text-slate-400 uppercase"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: colCount }, (_, i) => (
          <span key={i} className={cn(i + 1 === currentStage && 'text-sky-600')}>
            S{i + 1}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <div className="w-[7rem] shrink-0 truncate text-[11px] font-semibold text-slate-700">
            {row.label}
          </div>
          <div className="relative h-7 flex-1 rounded-md bg-slate-100/80">
            <div
              className="absolute top-1 bottom-1 rounded-md opacity-90"
              style={{
                left: `${((row.start - 1) / colCount) * 100}%`,
                width: `${((row.end - row.start + 1) / colCount) * 100}%`,
                background: `linear-gradient(90deg, ${row.color}, ${row.color}cc)`,
              }}
            />
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-sky-500"
              style={{ left: `${((currentStage - 0.5) / colCount) * 100}%` }}
              title={`Survey Stage ${currentStage}`}
            />
          </div>
        </div>
      ))}
    </Panel>
  )
}

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'
import type { Project } from '@/entities/types'

const TOWNSHIP_SERIES = [
  ['residential', 'plannedResidential', '#0ea5e9', 'Residential'],
  ['commercial', 'plannedCommercial', '#d97706', 'Commercial'],
  ['openSpaces', 'plannedOpenSpaces', '#7c3aed', 'Open Spaces'],
  ['amenities', 'plannedAmenities', '#dc2626', 'Amenities'],
  ['clubHouse', 'plannedClubHouse', '#059669', 'Club House'],
] as const

const MALL_SERIES = [
  ['residential', 'plannedResidential', '#ea580c', 'Retail'],
  ['commercial', 'plannedCommercial', '#c2410c', 'Cinema'],
  ['openSpaces', 'plannedOpenSpaces', '#9a3412', 'Parking'],
  ['amenities', 'plannedAmenities', '#b45309', 'Atrium F&B'],
  ['clubHouse', 'plannedClubHouse', '#f59e0b', 'Fun Zone'],
] as const

const SOCIETY_SERIES = [
  ['residential', 'plannedResidential', '#059669', 'Wing A'],
  ['commercial', 'plannedCommercial', '#047857', 'Wing B'],
  ['openSpaces', 'plannedOpenSpaces', '#34d399', 'Landscape'],
  ['amenities', 'plannedAmenities', '#10b981', 'Club'],
  ['clubHouse', 'plannedClubHouse', '#6ee7b7', 'EV Podium'],
] as const

function seriesFor(type: Project['type'] | undefined) {
  if (type === 'mall') return MALL_SERIES
  if (type === 'society') return SOCIETY_SERIES
  return TOWNSHIP_SERIES
}

export function ProgressChartPanel() {
  const project = useAppStore((s) => s.project)
  const snapshots = useAppStore((s) => s.snapshots)
  const setHighlightPhase = useAppStore((s) => s.setHighlightPhase)
  const highlightPhase = useAppStore((s) => s.highlightPhase)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const setMissionIndex = useAppStore((s) => s.setMissionIndex)

  const SERIES = seriesFor(project?.type)
  const cursorDate = snapshots[activeMissionIndex]?.date
  const title =
    project?.type === 'mall'
      ? 'Mall progress curves'
      : project?.type === 'society'
        ? 'Society progress curves'
        : 'Component progress curves'

  return (
    <Panel
      title={title}
      accent="blue"
      action={
        <span className="text-[10px] font-medium text-[#94a3b8]">
          Solid = actual · dashed = planned · click to scrub survey
        </span>
      }
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col p-3 pt-1"
    >
      <div className="mb-2 flex shrink-0 flex-wrap gap-3 px-1 text-[10px]">
        {SERIES.map(([key, , color, label]) => (
          <button
            key={key}
            type="button"
            className={cn(
              'flex items-center gap-1.5 font-semibold transition',
              highlightPhase === key ? 'text-[#0f172a]' : 'text-[#64748b] hover:text-[#0f172a]',
              highlightPhase && highlightPhase !== key && 'opacity-40',
            )}
            onMouseEnter={() => setHighlightPhase(key)}
            onMouseLeave={() => setHighlightPhase(null)}
          >
            <span className="size-2 rounded-full" style={{ background: color }} />
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-[160px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={snapshots}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            onClick={(state) => {
              const idx = state?.activeTooltipIndex
              if (typeof idx === 'number') setMissionIndex(idx)
            }}
          >
            <defs>
              <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: 11,
              }}
            />
            {cursorDate && (
              <ReferenceLine x={cursorDate} stroke="#0ea5e9" strokeDasharray="4 3" strokeWidth={1.5} />
            )}
            {SERIES.map(([, planned, color]) => (
              <Area
                key={planned}
                type="monotone"
                dataKey={planned}
                stroke={color}
                strokeDasharray="4 3"
                fill="transparent"
                strokeWidth={1.4}
                opacity={0.45}
              />
            ))}
            {SERIES.map(([actual, , color], i) => (
              <Area
                key={actual}
                type="monotone"
                dataKey={actual}
                stroke={color}
                fill={i === 0 ? 'url(#gRes)' : 'transparent'}
                strokeWidth={2.2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

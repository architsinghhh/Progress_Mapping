import { motion } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { missionFactor } from '@/shared/lib/missionScale'
import { cn } from '@/shared/lib/utils'

function VolumeBar({
  label,
  done,
  planned,
  tone,
}: {
  label: string
  done: number
  planned: number
  tone: 'cut' | 'fill'
}) {
  const pct = planned <= 0 ? 0 : Math.min(100, Math.round((done / planned) * 100))
  const labelColor = tone === 'cut' ? 'text-amber-700' : 'text-sky-700'
  const barClass =
    tone === 'cut'
      ? 'bg-gradient-to-r from-amber-400 to-orange-500'
      : 'bg-gradient-to-r from-sky-400 to-indigo-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold">
        <span className={cn('w-8 shrink-0', labelColor)}>{label}</span>
        <span className="min-w-0 flex-1 text-right tabular-nums text-[#475569]">
          {done.toLocaleString()} / {planned.toLocaleString()} m³
          <span className="ml-1.5 text-[#94a3b8]">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className={cn('h-full rounded-full', barClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

export function VolumePanel() {
  const volumes = useAppStore((s) => s.volumes)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const selectZone = useAppStore((s) => s.selectZone)
  const setComparisonMode = useAppStore((s) => s.setComparisonMode)
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab)
  const setSelectedTerrainId = useAppStore((s) => s.setSelectedTerrainId)

  const factor = missionFactor(activeMissionIndex, missions.length)

  const plannedCut = volumes.reduce((s, v) => s + v.cutM3, 0)
  const plannedFill = volumes.reduce((s, v) => s + v.fillM3, 0)
  const doneCut = volumes.reduce((s, v) => s + Math.round(v.cutM3 * factor), 0)
  const doneFill = volumes.reduce((s, v) => s + Math.round(v.fillM3 * factor), 0)
  const earthworkPct =
    plannedCut + plannedFill <= 0
      ? 0
      : Math.round(((doneCut + doneFill) / (plannedCut + plannedFill)) * 100)

  return (
    <Panel
      title="Cut–Fill progress"
      accent="sky"
      action={
        <span className="text-[10px] font-semibold text-[#0369a1]">
          {earthworkPct}% of planned earthwork
        </span>
      }
      className="h-full"
      bodyClassName="scrollbar-thin flex flex-col gap-3 overflow-auto p-3"
    >
      <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-wide text-sky-800/70 uppercase">
          <span>Site total</span>
          <span className="normal-case tracking-normal text-sky-900">
            Cut {doneCut.toLocaleString()} / {plannedCut.toLocaleString()} · Fill{' '}
            {doneFill.toLocaleString()} / {plannedFill.toLocaleString()} m³
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-500"
            animate={{ width: `${earthworkPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {volumes.map((v, i) => {
        const cutPlanned = v.cutM3
        const fillPlanned = v.fillM3
        const cutDone = Math.round(cutPlanned * factor)
        const fillDone = Math.round(fillPlanned * factor)
        const rockLeft =
          v.rockRemainingM3 != null && v.rockRemainingM3 > 0
            ? Math.round(v.rockRemainingM3 * Math.max(0, 1 - factor))
            : 0
        const active = v.zoneId === selectedZoneId
        return (
          <motion.button
            key={v.zoneId}
            type="button"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => {
              void selectZone(v.zoneId)
              setComparisonMode('dem')
              setWorkspaceTab('survey')
              if (rockLeft > 0) setSelectedTerrainId('t1')
            }}
            className={cn('volume-card text-left', active && 'is-active')}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-display text-sm font-bold text-[#0f172a]">
                {v.zoneCode} · {v.zoneName}
              </span>
              <span className="text-[10px] font-semibold text-[#64748b]">{v.changeLabel}</span>
            </div>
            <div className="space-y-2.5">
              <VolumeBar label="Cut" done={cutDone} planned={cutPlanned} tone="cut" />
              <VolumeBar label="Fill" done={fillDone} planned={fillPlanned} tone="fill" />
            </div>
            {rockLeft > 0 ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
                Rock remaining ~{rockLeft.toLocaleString()} m³
              </div>
            ) : null}
          </motion.button>
        )
      })}
    </Panel>
  )
}

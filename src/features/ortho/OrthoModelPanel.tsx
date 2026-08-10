import { motion } from 'framer-motion'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import { cn } from '@/shared/lib/utils'

export function OrthoModelPanel() {
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const floors = useAppStore((s) => s.floors)
  const selectedFloor = useAppStore((s) => s.selectedFloor)
  const setSelectedFloor = useAppStore((s) => s.setSelectedFloor)
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab)
  const whatIfActive = useAppStore((s) => s.whatIfActive)

  const factor = missionFactor(activeMissionIndex, missions.length)
  const baseZone = zones.find((z) => z.id === selectedZoneId)
  const zone = baseZone
    ? scaleZoneForMission(
        whatIfActive && baseZone.id === 'zone_a'
          ? { ...baseZone, floorsComplete: Math.min(baseZone.floorsPlanned, baseZone.floorsComplete + 1) }
          : baseZone,
        factor,
      )
    : undefined
  const mission = missions[activeMissionIndex]
  const floorsVisible = Math.max(1, zone?.floorsComplete || 1)

  return (
    <Panel
      title="Ortho / 3D Model · Superstructure"
      accent="indigo"
      action={zone && <StatusBadge status={zone.scheduleStatus} remark={zone.remark} />}
      className="h-full"
      bodyClassName="relative p-3"
    >
      <div
        className="viz-frame flex items-end justify-center"
        style={{ background: 'linear-gradient(180deg, #e0e7ff 0%, #f0f9ff 45%, #f8fafc 100%)' }}
      >
        <div
          className="absolute bottom-[18%] left-[8%] right-[8%] h-[42%] origin-bottom rounded-full opacity-60"
          style={{
            background: 'radial-gradient(ellipse, rgba(14,165,233,0.18), transparent 70%)',
            transform: 'rotateX(68deg)',
          }}
        />
        <div
          className="absolute bottom-[20%] left-[12%] right-[12%] border border-slate-300/70"
          style={{
            height: '38%',
            transform: 'rotateX(68deg)',
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.1) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            backgroundColor: 'rgba(255,255,255,0.45)',
          }}
        />

        <div
          className="relative z-10 mb-10 flex items-end gap-3"
          style={{ transform: 'rotateX(8deg) rotateY(-18deg)' }}
        >
          {Array.from({ length: Math.min(floorsVisible, zone?.floorsPlanned || 8) }).map((_, i) => {
            const floorData = floors[i]
            const floorNum = i + 1
            const selected = selectedFloor === floorNum
            const done = floorData ? floorData.actual >= 90 : i < floorsVisible - 2
            const partial = floorData ? floorData.actual > 0 && floorData.actual < 90 : i === floorsVisible - 1
            return (
              <motion.button
                key={i}
                type="button"
                className={cn('relative w-16 rounded-md border', selected && 'ring-2 ring-sky-400 ring-offset-2')}
                style={{
                  height: 14 + i * 2,
                  marginBottom: i * 11,
                  marginLeft: i === 0 ? 0 : -8,
                  borderColor: done
                    ? 'rgba(14,165,233,0.65)'
                    : partial
                      ? 'rgba(184,134,84,0.7)'
                      : 'rgba(148,163,184,0.4)',
                  background: done
                    ? 'linear-gradient(135deg, rgba(56,189,248,0.45), rgba(99,102,241,0.2))'
                    : partial
                      ? 'linear-gradient(135deg, rgba(251,191,36,0.4), rgba(184,134,84,0.15))'
                      : 'rgba(255,255,255,0.55)',
                  boxShadow: selected
                    ? '0 0 0 2px rgba(14,165,233,0.35), 8px 8px 0 rgba(15,23,42,0.08)'
                    : '8px 8px 0 rgba(15,23,42,0.08)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                onClick={() => {
                  setSelectedFloor(selected ? null : floorNum)
                  setWorkspaceTab('progress')
                }}
              >
                <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500">
                  F{floorNum}
                </span>
                <div className="absolute inset-x-2 top-1 flex justify-between">
                  {[0, 1, 2].map((c) => (
                    <span key={c} className="h-2 w-1 rounded-sm bg-slate-700/25" />
                  ))}
                </div>
              </motion.button>
            )
          })}

          {zone &&
            Array.from({ length: Math.max(0, Math.min(3, zone.floorsPlanned - floorsVisible)) }).map((_, i) => (
              <div
                key={`ghost-${i}`}
                className="w-16 rounded-md border border-dashed border-slate-300 bg-white/40"
                style={{
                  height: 14,
                  marginBottom: (floorsVisible + i) * 11,
                  marginLeft: -8,
                  boxShadow: '8px 8px 0 rgba(15,23,42,0.04)',
                }}
              />
            ))}
        </div>

        <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-sm font-bold text-[#0f172a]">{zone?.name ?? 'Zone'}</div>
            <div className="text-[11px] text-[#64748b]">
              External superstructure · {mission?.label ?? '—'}
              {selectedFloor ? ` · Floor ${selectedFloor} focused` : ''}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-right text-[11px] shadow-sm backdrop-blur">
            <div className="font-semibold text-sky-600">
              {zone?.floorsComplete ?? 0}/{zone?.floorsPlanned ?? 0} floors
            </div>
            <div className="text-[#64748b]">{zone ? `${zone.overallProgress}% done` : '—'}</div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

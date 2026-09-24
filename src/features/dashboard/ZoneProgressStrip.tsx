import { useRef } from 'react'
import { motion } from 'framer-motion'
import { FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'
import type { Zone } from '@/entities/types'
import { useAppStore } from '@/store/appStore'
import { ScheduleLegend } from '@/shared/ui/ScheduleLegend'
import { cn, statusLabel } from '@/shared/lib/utils'
import { missionFactor, scaleZoneForMission } from '@/shared/lib/missionScale'
import { zoneRemarkKey } from '@/shared/lib/workRemarks'

/** One clear sentence on what work looks like in this zone right now. */
function zoneWorkSummary(zone: Zone, userRemark?: string): string {
  if (userRemark?.trim()) return userRemark.trim()

  const { floorsPlanned: planned, floorsComplete: done, overallProgress: pct, scheduleStatus: status } =
    zone

  if (planned <= 0) {
    if (status === 'completed') {
      return zone.remark?.trim() || 'Open works closed — grading and landscaping accepted.'
    }
    if (status === 'behind') {
      return zone.remark?.trim() || 'Open works lagging — landscaping / grading behind plan.'
    }
    return pct >= 70
      ? `Open works well advanced (~${pct}%) — finishing and softscape underway.`
      : `Open works / grading in progress (~${pct}% onsite).`
  }

  const next = Math.min(planned, done + 1)

  if (status === 'completed') {
    return (
      zone.remark?.trim() ||
      `G+${planned} closed — all ${planned} floors handed over and verified.`
    )
  }

  if (status === 'ahead') {
    return (
      zone.remark?.trim() ||
      `Ahead of plan — ${done}/${planned} floors closed; Floor ${next} moving early.`
    )
  }

  if (status === 'behind') {
    return (
      zone.remark?.trim() ||
      `Behind plan — ${done}/${planned} floors closed; Floor ${next} needs catch-up.`
    )
  }

  if (done >= planned) {
    return `Structure complete (G+${planned}) · finishing / handover checks at ${pct}%.`
  }

  if (done === 0) {
    return pct < 25
      ? `Early works — plinth / base for G+${planned}; ~${pct}% onsite.`
      : `Rising from base — Floor 1 of ${planned} in play · ${pct}% zone.`
  }

  return `Floor ${next} of ${planned} active · ${done} floors closed · ${pct}% zone complete.`
}

export function ZoneProgressStrip() {
  const zones = useAppStore((s) => s.zones)
  const selectedZoneId = useAppStore((s) => s.selectedZoneId)
  const selectZone = useAppStore((s) => s.selectZone)
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab)
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const whatIfActive = useAppStore((s) => s.whatIfActive)
  const pulseCriticalPath = useAppStore((s) => s.pulseCriticalPath)
  const workRemarks = useAppStore((s) => s.workRemarks)
  const project = useAppStore((s) => s.project)
  const zonesFromExcel = useAppStore((s) => s.zonesFromExcel)
  const excelLoadError = useAppStore((s) => s.excelLoadError)
  const reloadZonesFromExcel = useAppStore((s) => s.reloadZonesFromExcel)
  const importZonesFromExcelFile = useAppStore((s) => s.importZonesFromExcelFile)
  const fileRef = useRef<HTMLInputElement>(null)

  const factor = missionFactor(activeMissionIndex, missions.length)
  const scaled = zones.map((z) => {
    let s = scaleZoneForMission(z, factor)
    if (whatIfActive && z.id === 'zone_a') {
      s = {
        ...s,
        overallProgress: Math.min(100, s.overallProgress + 4),
        scheduleStatus: s.scheduleStatus === 'behind' ? 'on_track' : s.scheduleStatus,
      }
    }
    if (whatIfActive && z.id === 'zone_b') {
      s = { ...s, overallProgress: Math.max(0, s.overallProgress - 2) }
    }
    return s
  })

  const openZone = (id: string) => {
    void selectZone(id)
    setWorkspaceTab('progress')
  }

  const canExcel = Boolean(project)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ScheduleLegend />
        {canExcel ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {zonesFromExcel ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <FileSpreadsheet className="size-3" />
                From Excel
              </span>
            ) : null}
            {project?.excelSource ? (
              <button
                type="button"
                className="pdf-viewer__icon-btn inline-flex items-center gap-1 text-[10px] font-semibold"
                title="Reload zones from project workbook"
                onClick={() => void reloadZonesFromExcel()}
              >
                <RefreshCw className="size-3.5" />
                Reload
              </button>
            ) : null}
            <button
              type="button"
              className="pdf-viewer__icon-btn inline-flex items-center gap-1 text-[10px] font-semibold"
              title="Import a Sheet2 workbook"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Import Excel
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void importZonesFromExcelFile(f)
              }}
            />
          </div>
        ) : null}
      </div>
      {excelLoadError ? (
        <p className="text-[11px] font-medium text-rose-600">{excelLoadError}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {scaled.map((zone, i) => {
          const active = zone.id === selectedZoneId
          const pulse = pulseCriticalPath && zone.scheduleStatus === 'behind'
          const summary = zoneWorkSummary(zone, workRemarks[zoneRemarkKey(zone.id)])
          return (
            <motion.button
              key={zone.id}
              type="button"
              onClick={() => openZone(zone.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              data-status={zone.scheduleStatus}
              title="Open floor-wise progress for this zone"
              className={cn('zone-card zone-card--compact', active && 'is-active', pulse && 'zone-card--pulse')}
              style={{ ['--card-accent' as string]: zone.color }}
            >
              <div className="zone-card__rest">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-bold text-[#0f172a]">
                    <span style={{ color: zone.color }}>{zone.code}</span>
                    <span className="text-[#94a3b8]"> · </span>
                    {zone.name}
                  </span>
                  <span className="font-display text-lg font-extrabold tabular-nums text-[#0f172a]">
                    {zone.overallProgress}%
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase',
                      zone.scheduleStatus === 'completed' && 'bg-slate-100 text-slate-700',
                      zone.scheduleStatus === 'on_track' && 'bg-blue-50 text-blue-700',
                      zone.scheduleStatus === 'ahead' && 'bg-emerald-50 text-emerald-700',
                      zone.scheduleStatus === 'behind' && 'bg-red-50 text-red-700',
                      zone.scheduleStatus === 'not_started' && 'bg-slate-50 text-slate-500',
                    )}
                  >
                    {statusLabel(zone.scheduleStatus)}
                  </span>
                  <span className="text-[10px] font-medium text-[#94a3b8]">
                    {zone.floorsPlanned > 0
                      ? `G+${zone.floorsPlanned}`
                      : 'Open works'}
                  </span>
                </div>
                <p className="zone-card__hint">Hover for condition · click for floors</p>
              </div>

              <div className="zone-card__hover" aria-hidden>
                <p className="zone-card__hover-label">Work condition</p>
                <p className="zone-card__hover-summary">{summary}</p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

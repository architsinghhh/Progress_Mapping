import * as XLSX from 'xlsx'
import type { FloorComparison, ProgressItem, ScheduleStatus, Zone } from '@/entities/types'
import { buildFloorComparisons } from '@/shared/lib/floorProgress'
import {
  mergePackagesIntoZones,
  parseSheet1Packages,
  parseSiteWorkbook,
  packageForZone,
  type ParsedPackage,
  type SiteWorkbookParseResult,
} from '@/services/excel/parseSiteWorkbook'

/** Project id → public workbook URL (Sheet2 zones + Sheet1 packages). */
export const SITE_EXCEL_SOURCES: Record<string, string> = {
  prj_sage_repose: '/Sage/Reports/Reports/The%20sage%20by%20repose.xlsx',
}

export function excelSourceForProject(projectId: string | null | undefined): string | null {
  if (!projectId) return null
  return SITE_EXCEL_SOURCES[projectId] ?? null
}

function statusFromPct(onsite: number, planned: number): ScheduleStatus {
  if (onsite <= 0) return 'not_started'
  if (onsite >= 95) return 'completed'
  if (onsite + 8 < planned) return 'behind'
  if (onsite > planned + 5) return 'ahead'
  return 'on_track'
}

function phaseFromLabel(label: string): ProgressItem['phase'] {
  const t = label.toLowerCase()
  if (t.includes('landscape') || t.includes('lighting') || t.includes('interior')) {
    return 'landscaping'
  }
  if (t.includes('finish')) return 'finishing'
  if (t.includes('mep') || t.includes('electric') || t.includes('plumb')) return 'superstructure'
  return 'plinth'
}

/** Progress from Sheet1 package tasks when present; else from zone %. */
export function synthesizeProgress(
  zone: Zone,
  packages: ParsedPackage[] = [],
): ProgressItem[] {
  const pkg = packageForZone(zone.name, packages)
  if (pkg?.tasks.length) {
    return pkg.tasks.map((t) => ({
      id: `${zone.id}_${t.id}`,
      zoneId: zone.id,
      phase: phaseFromLabel(t.label),
      label: `${t.id} ${t.label}`,
      plannedDays: t.durationDays != null ? String(Math.round(t.durationDays)) : '—',
      plannedPercent: t.actualPct,
      onsitePercent: t.actualPct,
      status: statusFromPct(t.actualPct, t.actualPct),
      remark: [t.start && `Start ${t.start}`, t.end && `End ${t.end}`].filter(Boolean).join(' · ') ||
        'Sheet1',
      lastUpdated: new Date().toISOString().slice(0, 10),
    }))
  }

  const p = zone.overallProgress
  if (p <= 0 || zone.scheduleStatus === 'not_started') {
    return [
      {
        id: `${zone.id}_none`,
        zoneId: zone.id,
        phase: 'plinth',
        label: 'No progress in workbook',
        plannedDays: '—',
        plannedPercent: 0,
        onsitePercent: 0,
        status: 'not_started',
        remark: zone.remark ?? 'No Sheet1/Sheet2 % for this package yet',
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
    ]
  }

  // Single overall from Sheet1 (roads / landscaping without subtasks)
  return [
    {
      id: `${zone.id}_overall`,
      zoneId: zone.id,
      phase: 'plinth',
      label: zone.name,
      plannedDays: '—',
      plannedPercent: p,
      onsitePercent: p,
      status: statusFromPct(p, p),
      remark: zone.remark ?? 'Sheet1',
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
  ]
}

export function synthesizeFloors(zone: Zone): FloorComparison[] {
  return buildFloorComparisons(zone)
}

function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = wb.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  })
}

export function parseWorkbookArrayBuffer(buf: ArrayBuffer): SiteWorkbookParseResult {
  // cellDates:false — keep Excel serials; SheetJS Date conversion shifts days in IST
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  const sheet2Name =
    wb.SheetNames.find((n) => n.toLowerCase() === 'sheet2') ??
    wb.SheetNames[1] ??
    wb.SheetNames[0]
  if (!sheet2Name) throw new Error('Workbook has no sheets')

  const sheet1Name =
    wb.SheetNames.find((n) => n.toLowerCase() === 'sheet1') ?? wb.SheetNames[0]

  let result = parseSiteWorkbook(sheetRows(wb, sheet2Name), sheet2Name)
  const packages = parseSheet1Packages(sheetRows(wb, sheet1Name))
  result = mergePackagesIntoZones(result, packages)
  return result
}

export async function loadSiteExcelFromUrl(url: string): Promise<SiteWorkbookParseResult> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Excel HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const parsed = parseWorkbookArrayBuffer(buf)
  if (!parsed.zones.length) throw new Error('No zones found in Excel (need a Zones row on Sheet2)')
  return parsed
}

export async function loadSiteExcelFromFile(file: File): Promise<SiteWorkbookParseResult> {
  const buf = await file.arrayBuffer()
  const parsed = parseWorkbookArrayBuffer(buf)
  if (!parsed.zones.length) throw new Error('No zones found in Excel (need a Zones row on Sheet2)')
  return parsed
}

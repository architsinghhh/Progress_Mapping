import type { ScheduleStatus, Zone } from '@/entities/types'

const ZONE_COLORS = [
  '#0d9488',
  '#2563eb',
  '#c026d3',
  '#7c3aed',
  '#a16207',
  '#15803d',
  '#ea580c',
  '#0891b2',
]

export type ParsedVillaRow = {
  wing: string
  section: string
  actualPct: number
  /** Committed overall % when present */
  committedPct: number | null
  status: string
  startCommitted?: string
  startActual?: string
  possessionCommitted?: string
  possessionActual?: string
  /** Sheet2: Actual time to delivery (months) */
  actualTimeToDeliveryMonths: number | null
  /** Sheet2: Time to delivery (months) */
  timeToDeliveryMonths: number | null
  /** Sheet2: Delayed % */
  delayedPct: number | null
  /** Sheet2: Delayed In Months */
  delayMonths: number | null
}

/** Sheet1 construction package (lounge / club / roads / landscaping). */
export type ParsedPackageTask = {
  id: string
  label: string
  actualPct: number
  start?: string
  end?: string
  durationDays: number | null
}

export type ParsedPackage = {
  /** Normalized key for matching Sheet2 zone names */
  key: string
  name: string
  actualPct: number
  tasks: ParsedPackageTask[]
}

export type SiteWorkbookParseResult = {
  /** Home-page zones (from the Zones row, with section averages when available) */
  zones: Zone[]
  villas: ParsedVillaRow[]
  /** Sheet1 packages (lounge, club, roads, landscaping, …) */
  packages: ParsedPackage[]
  asOf?: string
  sheetName: string
}

export function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Villas belonging to a home zone (North Zone → its Sheet2 villa rows). */
export function villasForZone(zoneName: string, villas: ParsedVillaRow[]): ParsedVillaRow[] {
  const key = normKey(zoneName)
  return villas.filter((v) => {
    const sk = normKey(v.section)
    return sk === key || sk.includes(key) || key.includes(sk)
  })
}

/** Match Sheet1 package to a Sheet2 zone name. */
export function packageForZone(
  zoneName: string,
  packages: ParsedPackage[],
): ParsedPackage | undefined {
  const zk = normKey(zoneName)
  // Direct / substring
  const direct = packages.find(
    (p) => zk === p.key || zk.includes(p.key) || p.key.includes(zk),
  )
  if (direct) return direct

  // Sheet2 aliases → Sheet1 package keys
  if (/recr?eation|lounge/i.test(zoneName)) {
    return packages.find((p) => p.key.includes('recreation') || p.key.includes('lounge'))
  }
  if (/club/i.test(zoneName)) {
    return packages.find((p) => p.key.includes('club'))
  }
  if (/road/i.test(zoneName)) {
    return packages.find((p) => p.key.includes('road') || p.key.includes('trimix'))
  }
  if (/landscape|common\s*area/i.test(zoneName)) {
    return packages.find(
      (p) => p.key.includes('commonarealandscap') || p.key.includes('landscapingdevelopment'),
    )
  }
  return undefined
}

function cellStr(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

function toPct(v: unknown): number | null {
  if (v == null || v === '' || v === ' ') return null
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null
    return v <= 1 ? Math.round(v * 100) : Math.round(v)
  }
  const s = String(v).replace('%', '').trim()
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return n <= 1 ? Math.round(n * 100) : Math.round(n)
}

function slugId(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  return `xl_${s || 'zone'}`
}

function codeFromName(name: string, i: number): string {
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  return (letters.slice(0, 3) || `Z${i + 1}`).slice(0, 3)
}

function statusFromLabel(label: string, pct: number): ScheduleStatus {
  const s = label.toLowerCase()
  if (s.includes('not started') || (pct === 0 && !s.includes('delay'))) return 'not_started'
  if (s.includes('complete') || pct >= 95) return 'completed'
  if (s.includes('delay') || s.includes('behind')) return 'behind'
  if (s.includes('progress')) return pct < 40 ? 'behind' : 'on_track'
  if (pct < 35) return 'behind'
  return 'on_track'
}

function layoutZone(i: number, n: number): { pathD: string; center: { x: number; y: number } } {
  const cols = Math.min(3, Math.max(1, n))
  const col = i % cols
  const row = Math.floor(i / cols)
  const w = 150
  const h = 110
  const gap = 18
  const x = 36 + col * (w + gap)
  const y = 36 + row * (h + gap)
  return {
    pathD: `M${x} ${y} h${w} v${h} h-${w} Z`,
    center: { x: x + w / 2, y: y + h / 2 },
  }
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * Excel serial → calendar Y/M/D (Lotus 1900 leap-year bug aware).
 * Avoids SheetJS cellDates timezone shift (IST was showing dates −1 day).
 */
function excelSerialToYmd(serial: number): { y: number; m: number; d: number } | null {
  if (!Number.isFinite(serial) || serial < 1) return null
  // Excel incorrectly treats 1900 as leap year; serials >= 60 are after the fake Feb 29
  const adjusted = serial >= 60 ? serial - 1 : serial
  const epoch = Date.UTC(1899, 11, 31) // 1899-12-31
  const ms = epoch + Math.floor(adjusted) * 86400000
  const dt = new Date(ms)
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  }
}

/** Convert Excel serial / Date / string → YYYY-MM-DD without timezone shift. */
function dateCell(v: unknown): string | undefined {
  if (v == null || v === '') return undefined

  // Raw Excel serial (preferred path with cellDates:false)
  if (typeof v === 'number' && Number.isFinite(v) && v > 20000 && v < 80000) {
    const p = excelSerialToYmd(v)
    if (p) return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`
  }

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    // Prefer local Y/M/D — toISOString shifts back a day in IST
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`
  }

  const s = cellStr(v)
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // e.g. 15-Feb-25
  const m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/)
  if (m) {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    }
    const mo = months[m[2].toLowerCase()]
    if (mo) {
      let y = Number(m[3])
      if (y < 100) y += 2000
      return `${y}-${pad2(mo)}-${pad2(Number(m[1]))}`
    }
  }
  return s || undefined
}

function numCell(v: unknown): number | null {
  if (v == null || v === '' || v === ' ') return null
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100) / 100
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Parse a site status workbook (Sheet2-style):
 * - Villa blocks under section headers (e.g. "North Zone")
 * - A "Zones" row listing the home-page packages
 */
export function parseSiteWorkbook(rows: unknown[][], sheetName: string): SiteWorkbookParseResult {
  const grid = rows.map((r) => (Array.isArray(r) ? r : []))

  let asOf: string | undefined
  const first = grid[0]?.[0]
  asOf = dateCell(first) ?? (first ? cellStr(first) : undefined)

  // Default Sheet2 layout from The sage by repose.xlsx
  let wingCol = 1
  let startCommittedCol = 2
  let startActualCol = 3
  let possCommittedCol = 4
  let possActualCol = 5
  let statusCol = 10
  let actualCol = 8
  let committedPctCol = 7
  let delayMonthsCol = 12
  let delayedPctCol = 11
  let timeToCol = 9
  let actualTimeToCol = 6

  for (let r = 0; r < Math.min(8, grid.length); r++) {
    const row = grid[r]
    for (let c = 0; c < row.length; c++) {
      const t = cellStr(row[c]).toLowerCase().replace(/\s+/g, ' ')
      if (t === 'wings' || t === 'wing') wingCol = c
      if (t === 'status') statusCol = c
      if (t.includes('delayed in month')) delayMonthsCol = c
      else if (t.includes('delayed %') || t === 'delayed%') delayedPctCol = c
      if (t.includes('actual time') && t.includes('delivery')) actualTimeToCol = c
      else if (t.includes('time to delivery') && !t.includes('actual')) timeToCol = c
      if (t.includes('start date')) startCommittedCol = c
      if (t.includes('possession date')) possCommittedCol = c
      if (t.includes('over all work') || t.includes('overall work')) committedPctCol = c
    }
    const next = grid[r + 1]
    if (next) {
      for (let c = 0; c < next.length; c++) {
        const t = cellStr(next[c]).toLowerCase()
        if (t === 'actual' && c >= 7 && c <= 10) actualCol = c
        if (t === 'committed' && c >= 7 && c <= 9) committedPctCol = c
        if (t === 'actual' && c === startCommittedCol + 1) startActualCol = c
        if (t === 'actual' && c === possCommittedCol + 1) possActualCol = c
        if (t === 'committed' && c === startCommittedCol) startCommittedCol = c
        if (t === 'committed' && c === possCommittedCol) possCommittedCol = c
      }
    }
  }

  // Home zone names from "Zones" row
  let homeZoneNames: string[] = []
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    for (let c = 0; c < row.length; c++) {
      if (normKey(cellStr(row[c])) === 'zones') {
        for (let c2 = c + 1; c2 < row.length; c2++) {
          const name = cellStr(row[c2])
          if (name) homeZoneNames.push(name)
        }
        break
      }
    }
    if (homeZoneNames.length) break
  }

  // Villa sections
  const villas: ParsedVillaRow[] = []
  let section = ''
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    const a = cellStr(row[0])
    const b = cellStr(row[wingCol])

    if (a && /zone/i.test(a) && !/^\d+$/.test(a)) {
      section = a
      continue
    }
    if (!a && b && /zone$/i.test(b) && !row[actualCol] && !row[statusCol]) {
      section = b
      continue
    }

    if (!section || !b) continue
    if (/^wings$/i.test(b) || normKey(b) === 'zones') continue
    if (/green\s*way/i.test(b)) continue

    const pct = toPct(row[actualCol]) ?? 0
    const committedPct = toPct(row[committedPctCol])
    const status = cellStr(row[statusCol]) || (pct === 0 ? 'Not Started' : 'In Progress')

    villas.push({
      wing: b,
      section,
      actualPct: pct,
      committedPct,
      status,
      startCommitted: dateCell(row[startCommittedCol]),
      startActual: dateCell(row[startActualCol]),
      possessionCommitted: dateCell(row[possCommittedCol]),
      possessionActual: dateCell(row[possActualCol]),
      actualTimeToDeliveryMonths: numCell(row[actualTimeToCol]),
      timeToDeliveryMonths: numCell(row[timeToCol]),
      delayedPct: toPct(row[delayedPctCol]),
      delayMonths: numCell(row[delayMonthsCol]),
    })
  }

  // Aggregate by section
  const bySection = new Map<string, ParsedVillaRow[]>()
  for (const v of villas) {
    const k = normKey(v.section)
    if (!bySection.has(k)) bySection.set(k, [])
    bySection.get(k)!.push(v)
  }

  if (!homeZoneNames.length) {
    homeZoneNames = [...new Set(villas.map((v) => v.section))]
  }

  const zones: Zone[] = homeZoneNames.map((name, i) => {
    const key = normKey(name)
    const sectionRows =
      bySection.get(key) ??
      [...bySection.entries()].find(([k]) => k.includes(key) || key.includes(k))?.[1]

    let pct = 0
    let status: ScheduleStatus = 'not_started'
    let type = 'Package'
    let remark = 'No % / dates in Excel Sheet2 yet'

    if (sectionRows?.length) {
      pct = Math.round(sectionRows.reduce((s, v) => s + v.actualPct, 0) / sectionRows.length)
      const delayed = sectionRows.filter((v) => /delay/i.test(v.status)).length
      const lagging = sectionRows.filter(
        (v) =>
          v.committedPct != null &&
          v.actualPct < v.committedPct - 5,
      ).length
      const notStarted = sectionRows.filter((v) => /not\s*started/i.test(v.status)).length
      // Any delayed / lagging plot marks the zone behind — don't wait for 1/3 of the wing.
      if (delayed > 0 || lagging > 0) status = 'behind'
      else status = statusFromLabel('', pct)
      type = `Villas · ${sectionRows.length} plots`
      remark = `Excel · avg ${pct}% · ${delayed} delayed · ${lagging} lagging plan · ${notStarted} not started`
    } else if (/lounge|club|road|landscape|green/i.test(name)) {
      type = /road/i.test(name)
        ? 'Infrastructure'
        : /landscape/i.test(name)
          ? 'Open spaces'
          : 'Amenities'
      remark = 'Listed in Excel Zones row · fill from Sheet1 if present'
    }

    const layout = layoutZone(i, homeZoneNames.length)
    return {
      id: slugId(name),
      code: codeFromName(name, i),
      name,
      type,
      color: ZONE_COLORS[i % ZONE_COLORS.length],
      overallProgress: pct,
      scheduleStatus: status,
      remark,
      floorsPlanned: 0,
      floorsComplete: 0,
      ...layout,
    }
  })

  return { zones, villas, packages: [], asOf, sheetName }
}

/**
 * Parse Sheet1 construction planning — package headers (11.0 RECREATION LOUNGE)
 * and numbered subtasks (11.1 Civil work) with ACTUAL % in column H (index 7).
 */
export function parseSheet1Packages(rows: unknown[][]): ParsedPackage[] {
  const grid = rows.map((r) => (Array.isArray(r) ? r : []))
  const packages: ParsedPackage[] = []
  let current: ParsedPackage | null = null

  const flush = () => {
    if (current) packages.push(current)
    current = null
  }

  for (const row of grid) {
    const a = cellStr(row[0])
    const b = cellStr(row[1])
    const pctCol = toPct(row[7])

    // Package header: "11.0 RECREATION LOUNGE" in col A, or task no + name in A/B
    const headerInA = a.match(/^\s*(\d+)\.0\s+(.+)$/i)
    const headerNumOnly =
      (typeof row[0] === 'number' || /^\d+$/.test(a)) &&
      b &&
      /recreation|club|common area|road|plumbing|electric|trimix|landscape/i.test(b)

    if (headerInA) {
      flush()
      const name = headerInA[2].trim()
      current = {
        key: normKey(name),
        name,
        actualPct: pctCol ?? 0,
        tasks: [],
      }
      continue
    }

    if (headerNumOnly) {
      flush()
      const name = b.trim()
      current = {
        key: normKey(name),
        name,
        actualPct: pctCol ?? 0,
        tasks: [],
      }
      continue
    }

    // Subtask: 11.1 + Civil work
    const sub = a.match(/^\s*(\d+)\.(\d+)\s*$/)
    if (current && sub && b) {
      current.tasks.push({
        id: a.trim(),
        label: b,
        actualPct: pctCol ?? 0,
        start: dateCell(row[2]),
        end: dateCell(row[4]) ?? dateCell(row[3]),
        durationDays: numCell(row[5]),
      })
    }
  }
  flush()
  return packages
}

/** Apply Sheet1 package % onto Sheet2 home zones that have no villa data. */
export function mergePackagesIntoZones(
  result: SiteWorkbookParseResult,
  packages: ParsedPackage[],
): SiteWorkbookParseResult {
  const zones = result.zones.map((z) => {
    const villaN = villasForZone(z.name, result.villas).length
    if (villaN > 0) return z
    const pkg = packageForZone(z.name, packages)
    if (!pkg) return z
    const pct = Math.round(pkg.actualPct)
    return {
      ...z,
      overallProgress: pct,
      scheduleStatus: statusFromLabel('', pct),
      type: z.type === 'Package' ? 'Sheet1 package' : z.type,
      remark: `Sheet1 · ${pct}% complete · ${pkg.tasks.length} tasks`,
    }
  })
  return { ...result, zones, packages }
}

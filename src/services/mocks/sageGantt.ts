/**
 * The Sage by Repose — construction Gantt from
 * public/Sage/Reports/.../GANTT CHART THE SAGE BY REPOSE-27726.xlsx
 * (package-level rows; Oct 2024 → Dec 2027).
 */

export type SageGanttRow = {
  id: string
  label: string
  /** 0–100 actual % complete from sheet */
  progress: number
  startIso: string
  endIso: string
  /** Position on project timeline (0–100) */
  startPct: number
  widthPct: number
  color: string
}

export const SAGE_GANTT_META = {
  projectStart: '2024-10-01',
  projectEnd: '2027-12-31',
  /** Sheet overall ~50.7% as of extract */
  overallProgress: 51,
  asOfLabel: 'Gantt sheet · The Sage by Repose',
  yearMarks: [
    { label: '2024', pct: 0 },
    { label: '2025', pct: 7.7 },
    { label: '2026', pct: 38.5 },
    { label: '2027', pct: 69.2 },
    { label: 'End', pct: 100 },
  ],
} as const

const COLORS = [
  '#0f766e',
  '#0d9488',
  '#14b8a6',
  '#0891b2',
  '#0284c7',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#a855f7',
  '#c026d3',
  '#db2777',
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#65a30d',
  '#15803d',
]

/** Package bars derived from Excel (gates + greenways + club / lounge). */
export const SAGE_GANTT_ROWS: SageGanttRow[] = [
  {
    id: 'gate_1',
    label: 'Main Gate',
    progress: 100,
    startIso: '2024-10-01',
    endIso: '2025-02-01',
    startPct: 0,
    widthPct: 10.4,
    color: COLORS[0],
  },
  {
    id: 'gate_2',
    label: 'Material Gate',
    progress: 100,
    startIso: '2024-10-01',
    endIso: '2025-02-01',
    startPct: 0,
    widthPct: 10.4,
    color: COLORS[1],
  },
  {
    id: 'gate_3',
    label: 'Plot Boundary Wall',
    progress: 100,
    startIso: '2024-10-01',
    endIso: '2025-02-01',
    startPct: 0,
    widthPct: 10.4,
    color: COLORS[2],
  },
  {
    id: 'sg1',
    label: 'South Greenway-1',
    progress: 100,
    startIso: '2024-12-11',
    endIso: '2025-02-15',
    startPct: 6.0,
    widthPct: 5.6,
    color: COLORS[3],
  },
  {
    id: 'sg2',
    label: 'South Greenway-2',
    progress: 60,
    startIso: '2026-02-15',
    endIso: '2027-01-15',
    startPct: 42.3,
    widthPct: 28.2,
    color: COLORS[4],
  },
  {
    id: 'sg3',
    label: 'South Greenway-3',
    progress: 33,
    startIso: '2026-02-27',
    endIso: '2026-12-15',
    startPct: 43.3,
    widthPct: 24.5,
    color: COLORS[5],
  },
  {
    id: 'sg4',
    label: 'South Greenway-4',
    progress: 37,
    startIso: '2026-02-15',
    endIso: '2026-12-31',
    startPct: 42.3,
    widthPct: 26.9,
    color: COLORS[6],
  },
  {
    id: 'sg5',
    label: 'South Greenway-5',
    progress: 17,
    startIso: '2026-05-05',
    endIso: '2027-01-31',
    startPct: 49.0,
    widthPct: 22.9,
    color: COLORS[7],
  },
  {
    id: 'ng1',
    label: 'North Greenway-1',
    progress: 77,
    startIso: '2025-10-15',
    endIso: '2026-09-30',
    startPct: 32.0,
    widthPct: 29.5,
    color: COLORS[8],
  },
  {
    id: 'ng2',
    label: 'North Greenway-2',
    progress: 7,
    startIso: '2026-05-31',
    endIso: '2026-12-31',
    startPct: 51.2,
    widthPct: 18.0,
    color: COLORS[9],
  },
  {
    id: 'ng3',
    label: 'North Greenway-3',
    progress: 0,
    startIso: '2026-09-15',
    endIso: '2027-05-01',
    startPct: 60.2,
    widthPct: 19.2,
    color: COLORS[10],
  },
  {
    id: 'ng4',
    label: 'North Greenway-4',
    progress: 0,
    startIso: '2026-10-01',
    endIso: '2027-04-10',
    startPct: 61.6,
    widthPct: 16.1,
    color: COLORS[11],
  },
  {
    id: 'ng5',
    label: 'North Greenway-5',
    progress: 13,
    startIso: '2026-05-15',
    endIso: '2026-12-30',
    startPct: 49.8,
    widthPct: 19.3,
    color: COLORS[12],
  },
  {
    id: 'lounge',
    label: 'Recreation Lounge',
    progress: 30,
    startIso: '2024-10-05',
    endIso: '2027-01-15',
    startPct: 0.3,
    widthPct: 70.2,
    color: COLORS[13],
  },
  {
    id: 'club',
    label: 'Club House',
    progress: 10,
    startIso: '2024-12-15',
    endIso: '2027-12-31',
    startPct: 6.3,
    widthPct: 93.7,
    color: COLORS[14],
  },
]

import { useMemo, useState } from 'react'
import { Panel } from '@/shared/ui/Panel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/shared/lib/utils'

const W = 720
const H = 460
const COLS = 72
const ROWS = 46

/** Synthetic DEM — shape varies by site type so mall/society ≠ Greenfield. */
function sampleElevation(
  nx: number,
  ny: number,
  missionBias: number,
  siteKind: 'township' | 'mall' | 'society' | string,
): number {
  const x = nx * 2 - 1
  const y = ny * 2 - 1

  if (siteKind === 'mall') {
    // Flat commercial pad with deep basement pit (SW) + atrium bowl
    let z = 12 - Math.abs(x) * 0.8 - Math.abs(y) * 0.5
    z -= 6.5 * (1 - missionBias * 0.4) * Math.exp(-((x + 0.35) ** 2 * 5 + (y - 0.35) ** 2 * 6))
    z -= 2.2 * Math.exp(-((x - 0.35) ** 2 * 10 + (y + 0.35) ** 2 * 12))
    z += 1.8 * Math.exp(-((x - 0.55) ** 2 * 8 + (y - 0.55) ** 2 * 8))
    z += 0.4 * Math.sin(x * 11 + y * 7)
    return z
  }

  if (siteKind === 'society') {
    // Twin tower pads + soft pocket depression under Wing B + lagoon
    let z = 16 - x * 1.2 - y * 0.9
    z += 3.5 * Math.exp(-((x + 0.45) ** 2 * 5 + (y + 0.2) ** 2 * 4))
    const soft = 5.5 * (1 - missionBias * 0.35)
    z -= soft * Math.exp(-((x - 0.45) ** 2 * 7 + (y + 0.15) ** 2 * 6))
    z -= 2.4 * Math.exp(-((x + 0.2) ** 2 * 9 + (y - 0.65) ** 2 * 14))
    z += 0.45 * Math.cos(x * 8 - y * 12)
    return z
  }

  // Broad site slope (NW high → SE low) — Greenfield township
  let z = 18 - x * 3.2 - y * 2.4

  // Residential towers pad (NW) — flattened plateau
  z += 4.5 * Math.exp(-((x + 0.55) ** 2 * 4.2 + (y + 0.45) ** 2 * 5.5))

  // School campus rise
  z += 3.2 * Math.exp(-((x - 0.15) ** 2 * 5 + (y + 0.5) ** 2 * 6))

  // Clubhouse bowl
  z -= 2.8 * Math.exp(-((x - 0.1) ** 2 * 8 + (y - 0.05) ** 2 * 10))

  // Row houses gentle terrace
  z += 2.1 * Math.exp(-((x + 0.5) ** 2 * 3.5 + (y - 0.45) ** 2 * 4))

  // Zone E rock mound / cut-fill (SE) — mission progresses flatten it
  const rock = 7.5 * (1 - missionBias * 0.55)
  z += rock * Math.exp(-((x - 0.55) ** 2 * 6.5 + (y - 0.5) ** 2 * 5.2))

  // Micro-relief so contours feel surveyed, not cartoon
  z +=
    0.55 * Math.sin(x * 9.2 + y * 3.1) +
    0.35 * Math.cos(x * 14.5 - y * 11.2) +
    0.25 * Math.sin(x * 22.1 + y * 17.4)

  return z
}

function buildGrid(
  missionBias: number,
  siteKind: string,
): { grid: number[][]; min: number; max: number } {
  const grid: number[][] = []
  let min = Infinity
  let max = -Infinity
  for (let r = 0; r <= ROWS; r++) {
    const row: number[] = []
    for (let c = 0; c <= COLS; c++) {
      const z = sampleElevation(c / COLS, r / ROWS, missionBias, siteKind)
      row.push(z)
      min = Math.min(min, z)
      max = Math.max(max, z)
    }
    grid.push(row)
  }
  return { grid, min, max }
}

type Seg = { x1: number; y1: number; x2: number; y2: number }

function cellSegs(z00: number, z10: number, z01: number, z11: number, level: number): Seg[] {
  const corners = [
    z00 >= level,
    z10 >= level,
    z11 >= level,
    z01 >= level,
  ]
  const idx =
    (corners[0] ? 8 : 0) + (corners[1] ? 4 : 0) + (corners[2] ? 2 : 0) + (corners[3] ? 1 : 0)
  if (idx === 0 || idx === 15) return []

  const lerp = (a: number, b: number) => {
    const d = b - a
    if (Math.abs(d) < 1e-6) return 0.5
    return (level - a) / d
  }

  const top = { x: lerp(z00, z10), y: 0 }
  const right = { x: 1, y: lerp(z10, z11) }
  const bottom = { x: lerp(z01, z11), y: 1 }
  const left = { x: 0, y: lerp(z00, z01) }

  const edge = (e: typeof top) => e
  const pairs: Record<number, [typeof top, typeof top][]> = {
    1: [[left, bottom]],
    2: [[bottom, right]],
    3: [[left, right]],
    4: [[top, right]],
    5: [
      [left, top],
      [bottom, right],
    ],
    6: [[top, bottom]],
    7: [[left, top]],
    8: [[left, top]],
    9: [[top, bottom]],
    10: [
      [left, bottom],
      [top, right],
    ],
    11: [[top, right]],
    12: [[left, right]],
    13: [[bottom, right]],
    14: [[left, bottom]],
  }

  return (pairs[idx] ?? []).map(([a, b]) => {
    const p = edge(a)
    const q = edge(b)
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
  })
}

function contourPaths(grid: number[][], level: number): string[] {
  const paths: string[] = []
  const cellW = W / COLS
  const cellH = H / ROWS

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const z00 = grid[r][c]
      const z10 = grid[r][c + 1]
      const z01 = grid[r + 1][c]
      const z11 = grid[r + 1][c + 1]
      for (const s of cellSegs(z00, z10, z01, z11, level)) {
        const x1 = (c + s.x1) * cellW
        const y1 = (r + s.y1) * cellH
        const x2 = (c + s.x2) * cellW
        const y2 = (r + s.y2) * cellH
        paths.push(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`)
      }
    }
  }
  return paths
}

function elevationFillRects(grid: number[][], min: number, max: number) {
  const range = Math.max(max - min, 0.001)
  const cellW = W / COLS
  const cellH = H / ROWS
  const rects: { x: number; y: number; fill: string }[] = []

  // Coarser fill grid for perf
  const step = 2
  for (let r = 0; r < ROWS; r += step) {
    for (let c = 0; c < COLS; c += step) {
      const z = grid[r][c]
      const t = (z - min) / range
      // Terrain ramp: deep teal low → sand mid → warm stone high
      const hue = 195 - t * 95
      const sat = 42 - t * 12
      const lit = 28 + t * 42
      rects.push({
        x: c * cellW,
        y: r * cellH,
        fill: `hsl(${hue} ${sat}% ${lit}%)`,
      })
    }
  }
  return { rects, cellW: cellW * step, cellH: cellH * step }
}

const ZONE_PARCELS: { id: string; label: string; x: number; y: number; w: number; h: number }[] = [
  { id: 'A', label: 'Towers', x: 48, y: 36, w: 168, h: 118 },
  { id: 'B', label: 'School', x: 248, y: 36, w: 168, h: 118 },
  { id: 'C', label: 'Club', x: 248, y: 188, w: 168, h: 72 },
  { id: 'D', label: 'Row', x: 48, y: 188, w: 168, h: 168 },
  { id: 'E', label: 'Retail', x: 448, y: 188, w: 200, h: 168 },
]

export function ContoursPanel() {
  const project = useAppStore((s) => s.project)
  const zones = useAppStore((s) => s.zones)
  const zone = useAppStore((s) => s.zones.find((z) => z.id === s.selectedZoneId))
  const missions = useAppStore((s) => s.missions)
  const activeMissionIndex = useAppStore((s) => s.activeMissionIndex)
  const mission = missions[activeMissionIndex]
  const [showFill, setShowFill] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showZones, setShowZones] = useState(true)

  const siteKind = project?.type ?? 'township'
  const missionBias = missions.length > 1 ? activeMissionIndex / (missions.length - 1) : 0

  const parcels = useMemo(() => {
    if (siteKind === 'township') return ZONE_PARCELS
    // Approximate parcels from zone centers for mock sites
    return zones.map((z, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      return {
        id: z.code,
        label: z.name.split('·')[0]?.trim().slice(0, 12) ?? z.code,
        x: 48 + col * 220,
        y: 40 + row * 200,
        w: 190,
        h: 150,
      }
    })
  }, [siteKind, zones])

  const map = useMemo(() => {
    const { grid, min, max } = buildGrid(missionBias, siteKind)
    const interval = 0.5
    const start = Math.ceil(min / interval) * interval
    const levels: number[] = []
    for (let z = start; z <= max; z += interval) levels.push(+z.toFixed(2))

    const lines = levels.map((level) => {
      const index = Math.round(level / interval) % 5 === 0
      return {
        level,
        index,
        d: contourPaths(grid, level).join(' '),
      }
    })

    const fill = elevationFillRects(grid, min, max)

    const labels = levels
      .filter((_, i) => i % 5 === 0)
      .map((level) => {
        const nx = 0.42 + (level % 1) * 0.08
        const ny = 0.28 + ((level * 3) % 5) * 0.1
        return {
          level,
          x: nx * W,
          y: Math.min(H - 24, Math.max(28, ny * H)),
        }
      })

    return { min, max, lines, fill, labels, interval }
  }, [missionBias, siteKind])

  return (
    <Panel
      title={
        siteKind === 'mall'
          ? 'Contours · Mall pad (mock DEM)'
          : siteKind === 'society'
            ? 'Contours · Society pad (mock DEM)'
            : 'Contours · Site Preparation'
      }
      accent="blue"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={cn('layer-chip', showFill && 'is-active')}
            onClick={() => setShowFill((v) => !v)}
          >
            DEM wash
          </button>
          <button
            type="button"
            className={cn('layer-chip', showLabels && 'is-active')}
            onClick={() => setShowLabels((v) => !v)}
          >
            Elev. labels
          </button>
          <button
            type="button"
            className={cn('layer-chip', showZones && 'is-active')}
            onClick={() => setShowZones((v) => !v)}
          >
            Zones
          </button>
        </div>
      }
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          <span className="font-display font-bold text-slate-800">{zone?.name ?? 'Site-wide'}</span>
          <span className="mx-1.5">·</span>
          <span>Topo contours from drone DEM</span>
          <span className="mx-1.5">·</span>
          <span className="font-semibold text-sky-700">Interval {map.interval} m</span>
        </div>
        <div className="font-medium text-slate-600">
          {mission?.label ?? 'Current'} · Day {mission?.dayOffset ?? 0}
        </div>
      </div>

      <div className="contours-frame contours-map relative min-h-[360px] flex-1 overflow-hidden">
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Site elevation contour map"
        >
          <defs>
            <linearGradient id="contourLegendRamp" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(195 42% 28%)" />
              <stop offset="45%" stopColor="hsl(155 36% 42%)" />
              <stop offset="75%" stopColor="hsl(75 38% 55%)" />
              <stop offset="100%" stopColor="hsl(32 48% 62%)" />
            </linearGradient>
            <filter id="contourSoft" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
            </filter>
            <pattern id="contourGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 H0 V40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Base */}
          <rect width={W} height={H} fill="#1e293b" />

          {showFill &&
            map.fill.rects.map((r, i) => (
              <rect
                key={i}
                x={r.x}
                y={r.y}
                width={map.fill.cellW + 0.5}
                height={map.fill.cellH + 0.5}
                fill={r.fill}
              />
            ))}

          {!showFill && <rect width={W} height={H} fill="#0f172a" />}
          <rect width={W} height={H} fill="url(#contourGrid)" />

          {/* Contour lines */}
          {map.lines.map((line) =>
            line.d ? (
              <path
                key={line.level}
                d={line.d}
                fill="none"
                stroke={line.index ? 'rgba(255,255,255,0.92)' : 'rgba(226,232,240,0.55)'}
                strokeWidth={line.index ? 1.65 : 0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}

          {/* Zone parcels */}
          {showZones &&
            parcels.map((p) => (
              <g key={p.id}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  rx={10}
                  fill="rgba(15,23,42,0.08)"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={1.2}
                  strokeDasharray="5 4"
                />
                <text
                  x={p.x + 10}
                  y={p.y + 18}
                  fill="rgba(255,255,255,0.9)"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="DM Sans, system-ui, sans-serif"
                >
                  Zone {p.id} · {p.label}
                </text>
              </g>
            ))}

          {/* Elevation labels on index contours */}
          {showLabels &&
            map.labels.map((lb) => (
              <g key={`lb-${lb.level}`} filter="url(#contourSoft)">
                <rect
                  x={lb.x - 18}
                  y={lb.y - 9}
                  width={36}
                  height={16}
                  rx={3}
                  fill="rgba(15,23,42,0.72)"
                />
                <text
                  x={lb.x}
                  y={lb.y + 3}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="DM Sans, system-ui, sans-serif"
                >
                  {lb.level.toFixed(1)}
                </text>
              </g>
            ))}

          {/* North arrow */}
          <g transform="translate(668 36)">
            <circle r="16" fill="rgba(15,23,42,0.55)" stroke="rgba(255,255,255,0.35)" />
            <path d="M0 8 L0 -10 L4 -2 L0 -4 L-4 -2 Z" fill="#f8fafc" />
            <text
              y="22"
              textAnchor="middle"
              fill="#f8fafc"
              fontSize="9"
              fontWeight="700"
              fontFamily="DM Sans, system-ui, sans-serif"
            >
              N
            </text>
          </g>

          {/* Scale bar */}
          <g transform="translate(24 422)">
            <rect x="0" y="0" width="120" height="22" rx="4" fill="rgba(15,23,42,0.55)" />
            <line x1="10" y1="14" x2="110" y2="14" stroke="#f8fafc" strokeWidth="2" />
            <line x1="10" y1="10" x2="10" y2="18" stroke="#f8fafc" strokeWidth="2" />
            <line x1="60" y1="11" x2="60" y2="17" stroke="#f8fafc" strokeWidth="1.5" />
            <line x1="110" y1="10" x2="110" y2="18" stroke="#f8fafc" strokeWidth="2" />
            <text x="60" y="10" textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="600">
              0  50 m  100
            </text>
          </g>

          {/* Legend */}
          <g transform="translate(24 24)">
            <rect width="168" height="58" rx="8" fill="rgba(15,23,42,0.62)" />
            <text x="12" y="18" fill="#f8fafc" fontSize="10" fontWeight="700">
              Elevation (m AMSL)
            </text>
            <rect x="12" y="26" width="144" height="8" rx="2" fill="url(#contourLegendRamp)" />
            <text x="12" y="48" fill="#cbd5e1" fontSize="9" fontWeight="600">
              {map.min.toFixed(1)}
            </text>
            <text x="156" y="48" textAnchor="end" fill="#cbd5e1" fontSize="9" fontWeight="600">
              {map.max.toFixed(1)}
            </text>
          </g>

          {/* Index vs intermediate key */}
          <g transform="translate(204 24)">
            <rect width="150" height="58" rx="8" fill="rgba(15,23,42,0.62)" />
            <line x1="14" y1="20" x2="48" y2="20" stroke="#fff" strokeWidth="2" />
            <text x="56" y="23" fill="#f1f5f9" fontSize="10" fontWeight="600">
              Index (2.5 m)
            </text>
            <line x1="14" y1="40" x2="48" y2="40" stroke="rgba(226,232,240,0.55)" strokeWidth="1" />
            <text x="56" y="43" fill="#cbd5e1" fontSize="10" fontWeight="600">
              Intermediate (0.5 m)
            </text>
          </g>
        </svg>
      </div>
    </Panel>
  )
}

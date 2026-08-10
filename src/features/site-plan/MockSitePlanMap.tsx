import type { Zone } from '@/entities/types'
import { cn } from '@/shared/lib/utils'

type MockSitePlanMapProps = {
  zones: Zone[]
  selectedZoneId: string
  onSelect: (id: string) => void
  showZones: boolean
  label: string
  tone: 'mall' | 'society' | 'default'
  className?: string
}

const TONE_BG: Record<MockSitePlanMapProps['tone'], string> = {
  mall: 'linear-gradient(145deg, #fef3c7 0%, #fdba74 45%, #9a3412 140%)',
  society: 'linear-gradient(145deg, #ecfdf5 0%, #6ee7b7 40%, #065f46 130%)',
  default: 'linear-gradient(145deg, #e2e8f0 0%, #94a3b8 50%, #334155 140%)',
}

/** SVG mock site plan for demo sites without real ortho capture. */
export function MockSitePlanMap({
  zones,
  selectedZoneId,
  onSelect,
  showZones,
  label,
  tone,
  className,
}: MockSitePlanMapProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)} style={{ background: TONE_BG[tone] }}>
      <svg viewBox="0 0 540 440" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="mock-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0 H0 V24" fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="540" height="440" fill="url(#mock-grid)" />
        <rect
          x="16"
          y="16"
          width="508"
          height="408"
          rx="10"
          fill="none"
          stroke="rgba(15,23,42,0.28)"
          strokeWidth="2"
          strokeDasharray="10 6"
        />
        {showZones &&
          zones.map((z) => {
            const active = z.id === selectedZoneId
            return (
              <g key={z.id} className="cursor-pointer" onClick={() => onSelect(z.id)}>
                <path
                  d={z.pathD}
                  fill={z.color}
                  fillOpacity={active ? 0.55 : 0.32}
                  stroke={active ? '#0f172a' : z.color}
                  strokeWidth={active ? 3 : 1.5}
                />
                <text
                  x={z.center.x}
                  y={z.center.y - 6}
                  textAnchor="middle"
                  className="pointer-events-none"
                  fill="#0f172a"
                  fontSize="13"
                  fontWeight="800"
                  fontFamily="Outfit, system-ui, sans-serif"
                >
                  {z.code}
                </text>
                <text
                  x={z.center.x}
                  y={z.center.y + 12}
                  textAnchor="middle"
                  className="pointer-events-none"
                  fill="#1e293b"
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                >
                  {z.name}
                </text>
                <text
                  x={z.center.x}
                  y={z.center.y + 26}
                  textAnchor="middle"
                  className="pointer-events-none"
                  fill="#334155"
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                >
                  {z.overallProgress}%
                </text>
              </g>
            )
          })}
      </svg>
      <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
        Mock plan · {label}
      </div>
      <div className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-amber-500/90 px-2 py-1 text-[9px] font-bold text-amber-950">
        Demo data — no site GLB
      </div>
    </div>
  )
}

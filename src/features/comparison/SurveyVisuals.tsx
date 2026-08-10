/** Survey stand-ins for Then/Now — CSS+SVG aerial (not real photogrammetry). */

type Variant = 'before' | 'after'

function uid(variant: Variant, name: string) {
  return `sv-${variant}-${name}`
}

function AerialDefs({ variant }: { variant: Variant }) {
  const bare = variant === 'before'
  return (
    <defs>
      <pattern id={uid(variant, 'soil')} width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill={bare ? '#d6cbb0' : '#9db387'} />
        <circle cx="3" cy="4" r="1.1" fill={bare ? 'rgba(120,100,70,0.18)' : 'rgba(60,80,40,0.2)'} />
        <circle cx="9" cy="9" r="0.9" fill="rgba(255,255,255,0.12)" />
        <circle cx="8" cy="2" r="0.7" fill={bare ? 'rgba(90,70,40,0.12)' : 'rgba(40,60,30,0.15)'} />
      </pattern>
      <pattern id={uid(variant, 'asphalt')} width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#4a5560" />
        <rect x="0" y="0" width="16" height="1" fill="rgba(255,255,255,0.04)" />
        <rect x="0" y="8" width="16" height="1" fill="rgba(0,0,0,0.08)" />
      </pattern>
      <pattern id={uid(variant, 'roofTile')} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#64748b" />
        <path d="M0 3 H6 M3 0 V6" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      </pattern>
      <linearGradient id={uid(variant, 'roofA')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="55%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id={uid(variant, 'roofB')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id={uid(variant, 'roofC')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a7f3d0" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id={uid(variant, 'roofD')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ddd6fe" />
        <stop offset="100%" stopColor="#6d28d9" />
      </linearGradient>
      <linearGradient id={uid(variant, 'roofE')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fecdd3" />
        <stop offset="100%" stopColor="#be123c" />
      </linearGradient>
      <filter id={uid(variant, 'shadow')} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.35" />
      </filter>
    </defs>
  )
}

function ParcelLabel({
  x,
  y,
  code,
  name,
  color,
}: {
  x: number
  y: number
  code: string
  name: string
  color: string
}) {
  return (
    <g>
      <rect x={x} y={y} width="72" height="22" rx="5" fill="rgba(15,23,42,0.82)" />
      <circle cx={x + 12} cy={y + 11} r="5" fill={color} />
      <text x={x + 22} y={y + 10} fill="#fff" fontSize="9" fontWeight="800" fontFamily="Outfit, sans-serif">
        {code}
      </text>
      <text x={x + 22} y={y + 18} fill="#cbd5e1" fontSize="6.5" fontWeight="600" fontFamily="Inter, sans-serif">
        {name}
      </text>
    </g>
  )
}

function Tree({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x + 1} cy={y + 2} rx={r * 0.9} ry={r * 0.45} fill="rgba(15,23,42,0.2)" />
      <circle cx={x} cy={y} r={r} fill="#14532d" />
      <circle cx={x - r * 0.3} cy={y - r * 0.25} r={r * 0.55} fill="#22c55e" />
      <circle cx={x + r * 0.25} cy={y - r * 0.1} r={r * 0.4} fill="#4ade80" opacity="0.85" />
    </g>
  )
}

export function OrthoSurveyScene({
  variant,
  missionIndex,
}: {
  variant: Variant
  missionIndex: number
}) {
  const built = variant === 'after'
  const level = built ? Math.min(1, 0.35 + missionIndex * 0.12) : 0
  const towerStories = built ? Math.max(3, 2 + missionIndex) : 0
  const towerH = built ? 36 + towerStories * 7 : 0
  const rowCols = built ? Math.min(6, 2 + Math.floor(missionIndex * 0.85)) : 0
  const plazaBays = built ? Math.min(6, 1 + Math.floor(missionIndex * 0.9)) : 0
  const schoolReady = built && missionIndex >= 1
  const clubReady = built && missionIndex >= 2

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#8fa87a]">
      <svg
        className="h-full w-full"
        viewBox="0 0 720 460"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <AerialDefs variant={variant} />

        {/* full site sheet */}
        <rect width="720" height="460" fill={`url(#${uid(variant, 'soil')})`} />

        {/* outer boundary fence */}
        <rect
          x="28"
          y="28"
          width="664"
          height="404"
          rx="8"
          fill="none"
          stroke="rgba(15,23,42,0.25)"
          strokeWidth="2"
          strokeDasharray="8 5"
        />

        {/* graded pads always visible */}
        <rect x="48" y="48" width="260" height="148" rx="12" fill={built ? 'rgba(226,232,240,0.55)' : 'rgba(214,201,170,0.9)'} stroke="#0ea5e9" strokeWidth="2.5" />
        <rect x="412" y="48" width="260" height="148" rx="12" fill={built ? 'rgba(254,243,199,0.45)' : 'rgba(214,201,170,0.9)'} stroke="#d97706" strokeWidth="2.5" />
        <rect x="48" y="264" width="260" height="148" rx="12" fill={built ? 'rgba(237,233,254,0.5)' : 'rgba(214,201,170,0.9)'} stroke="#7c3aed" strokeWidth="2.5" />
        <rect x="412" y="264" width="260" height="70" rx="12" fill={built ? 'rgba(209,250,229,0.5)' : 'rgba(214,201,170,0.9)'} stroke="#059669" strokeWidth="2.5" />
        <rect x="412" y="346" width="260" height="66" rx="12" fill={built ? 'rgba(254,226,226,0.5)' : 'rgba(214,201,170,0.9)'} stroke="#dc2626" strokeWidth="2.5" />

        {/* roads — always strong */}
        <rect x="328" y="28" width="64" height="404" fill={`url(#${uid(variant, 'asphalt')})`} />
        <rect x="28" y="212" width="664" height="36" fill={`url(#${uid(variant, 'asphalt')})`} />
        <rect x="340" y="28" width="40" height="404" fill="#5b6570" />
        <rect x="28" y="220" width="664" height="20" fill="#5b6570" />
        <line x1="360" y1="40" x2="360" y2="420" stroke="#f8fafc" strokeWidth="2" strokeDasharray="14 10" opacity="0.7" />
        <line x1="40" y1="230" x2="680" y2="230" stroke="#f8fafc" strokeWidth="2" strokeDasharray="14 10" opacity="0.7" />
        {/* sidewalks */}
        <rect x="320" y="28" width="8" height="404" fill="#d6d3d1" opacity="0.85" />
        <rect x="392" y="28" width="8" height="404" fill="#d6d3d1" opacity="0.85" />
        <rect x="28" y="204" width="664" height="8" fill="#d6d3d1" opacity="0.85" />
        <rect x="28" y="248" width="664" height="8" fill="#d6d3d1" opacity="0.85" />

        {/* BEFORE: survey stakes + cut outlines so Then is not empty */}
        {!built && (
          <g>
            {[
              [90, 90],
              [200, 90],
              [90, 160],
              [200, 160],
              [460, 90],
              [580, 90],
              [460, 160],
              [90, 310],
              [200, 310],
              [460, 290],
              [580, 370],
            ].map(([x, y], i) => (
              <g key={i}>
                <line x1={x} y1={y - 8} x2={x} y2={y + 8} stroke="#b45309" strokeWidth="2" />
                <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke="#b45309" strokeWidth="2" />
                <circle cx={x} cy={y} r="3" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
              </g>
            ))}
            <text x="70" y="130" fill="#78716c" fontSize="11" fontWeight="700" opacity="0.7">
              Cleared pad · awaiting massing
            </text>
            <text x="440" y="130" fill="#78716c" fontSize="11" fontWeight="700" opacity="0.7">
              Survey control points
            </text>
          </g>
        )}

        {/* AFTER: Zone A towers */}
        {built && (
          <g filter={`url(#${uid(variant, 'shadow')})`}>
            <rect x="88" y={178 - towerH} width="64" height={towerH} fill={`url(#${uid(variant, 'roofA')})`} stroke="#0c4a6e" strokeWidth="1.5" />
            <rect x="188" y={178 - towerH * 0.9} width="64" height={towerH * 0.9} fill={`url(#${uid(variant, 'roofA')})`} stroke="#0c4a6e" strokeWidth="1.5" />
            {Array.from({ length: towerStories }).map((_, i) => (
              <g key={i}>
                <rect x="96" y={178 - towerH + 8 + i * 8} width="48" height="3.5" fill="rgba(255,255,255,0.55)" />
                <rect x="196" y={178 - towerH * 0.9 + 8 + i * 8} width="48" height="3.5" fill="rgba(255,255,255,0.55)" />
              </g>
            ))}
            <rect x="78" y="176" width="190" height="16" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
            <rect x="78" y="176" width={190 * level} height="16" fill="#0ea5e9" opacity="0.35" />
          </g>
        )}

        {/* AFTER: Zone B school */}
        {schoolReady && (
          <g filter={`url(#${uid(variant, 'shadow')})`} opacity={0.7 + level * 0.3}>
            <rect x="440" y="70" width="130" height="78" rx="4" fill={`url(#${uid(variant, 'roofB')})`} stroke="#92400e" strokeWidth="1.5" />
            <rect x="580" y="82" width="70" height="54" rx="3" fill="#f59e0b" stroke="#92400e" strokeWidth="1" />
            <rect x="450" y="158" width="80" height="22" fill="#4ade80" stroke="#15803d" strokeWidth="1" />
            <rect x="560" y="156" width="70" height="24" fill="#22c55e" stroke="#166534" strokeWidth="1" />
            <line x1="565" y1="168" x2="625" y2="168" stroke="#fff" strokeWidth="1" strokeDasharray="4 3" />
          </g>
        )}

        {/* AFTER: Zone D row houses */}
        {built && rowCols > 0 && (
          <g filter={`url(#${uid(variant, 'shadow')})`}>
            {Array.from({ length: 2 }).map((_, r) =>
              Array.from({ length: rowCols }).map((_, c) => (
                <g key={`${r}-${c}`}>
                  <rect
                    x={70 + c * 38}
                    y={286 + r * 46}
                    width="32"
                    height="36"
                    rx="2"
                    fill={`url(#${uid(variant, 'roofD')})`}
                    stroke="#5b21b6"
                    strokeWidth="1"
                  />
                  <polygon
                    points={`${70 + c * 38},${286 + r * 46} ${86 + c * 38},${276 + r * 46} ${102 + c * 38},${286 + r * 46}`}
                    fill="#7c2d12"
                  />
                </g>
              )),
            )}
            <rect x="64" y="384" width="228" height="16" fill="#4ade80" stroke="#15803d" strokeWidth="1" />
          </g>
        )}

        {/* AFTER: Clubhouse */}
        {clubReady && (
          <g filter={`url(#${uid(variant, 'shadow')})`}>
            <rect x="448" y="278" width="140" height="42" rx="4" fill={`url(#${uid(variant, 'roofC')})`} stroke="#065f46" strokeWidth="1.5" />
            <ellipse cx="620" cy="298" rx="32" ry="16" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" opacity="0.9" />
            <ellipse cx="620" cy="298" rx="18" ry="8" fill="#7dd3fc" opacity="0.7" />
          </g>
        )}

        {/* AFTER: Retail plaza */}
        {built && plazaBays > 0 && (
          <g filter={`url(#${uid(variant, 'shadow')})`}>
            <rect x="440" y="360" width="170" height="40" fill={`url(#${uid(variant, 'roofTile')})`} stroke="#57534e" strokeWidth="1" />
            {Array.from({ length: plazaBays }).map((_, i) => (
              <rect
                key={i}
                x={448 + i * 26}
                y="354"
                width="22"
                height="28"
                fill={`url(#${uid(variant, 'roofE')})`}
                stroke="#9f1239"
                strokeWidth="1"
              />
            ))}
            {/* parking stalls */}
            <rect x="440" y="400" width="200" height="10" fill="#57534e" />
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={i} x1={450 + i * 26} y1="400" x2={450 + i * 26} y2="410" stroke="#f8fafc" strokeWidth="1" opacity="0.6" />
            ))}
            <circle cx="640" cy="380" r="12" fill="#78716c" stroke="#44403c" strokeWidth="1" />
            <circle cx="652" cy="390" r="7" fill="#57534e" />
          </g>
        )}

        {/* trees — denser when built */}
        {(built
          ? [
              [110, 220],
              [200, 220],
              [280, 220],
              [440, 220],
              [540, 220],
              [640, 220],
              [340, 100],
              [340, 340],
              [80, 400],
              [300, 400],
              [500, 250],
            ]
          : [
              [110, 220],
              [540, 220],
              [340, 100],
            ]
        ).map(([x, y], i) => (
          <Tree key={i} x={x} y={y} r={built ? 8 : 6} />
        ))}

        <ParcelLabel x={56} y={56} code="A" name="TOWERS" color="#0ea5e9" />
        <ParcelLabel x={420} y={56} code="B" name="SCHOOL" color="#d97706" />
        <ParcelLabel x={56} y={272} code="D" name="ROW HOUSES" color="#7c3aed" />
        <ParcelLabel x={420} y={272} code="C" name="CLUBHOUSE" color="#059669" />
        <ParcelLabel x={420} y={354} code="E" name="RETAIL" color="#dc2626" />

        {/* banner */}
        <rect x="28" y="8" width={built ? 210 : 240} height="18" rx="4" fill="rgba(15,23,42,0.75)" />
        <text x="38" y="21" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
          {built
            ? `ORTHO · CURRENT · Mission +${missionIndex}`
            : 'ORTHO · BASELINE · Flat land / cleared pads'}
        </text>
      </svg>
    </div>
  )
}

/** Cartoon mall aerial — Riverside Galleria demo (not Greenfield GLB). */
export function MallOrthoScene({
  variant,
  missionIndex,
}: {
  variant: Variant
  missionIndex: number
}) {
  const built = variant === 'after'
  const level = built ? Math.min(1, 0.25 + missionIndex * 0.18) : 0
  const atrium = built && missionIndex >= 2
  const cinema = built && missionIndex >= 3
  const roof = built && missionIndex >= 4

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#c4a574]">
      <svg className="h-full w-full" viewBox="0 0 720 460" preserveAspectRatio="xMidYMid meet">
        <AerialDefs variant={variant} />
        <rect width="720" height="460" fill={built ? '#b45309' : '#d6cbb0'} opacity="0.35" />
        <rect width="720" height="460" fill={`url(#${uid(variant, 'soil')})`} />

        {/* ring road */}
        <rect x="40" y="40" width="640" height="380" rx="16" fill="none" stroke="rgba(15,23,42,0.3)" strokeWidth="3" strokeDasharray="12 7" />
        <rect x="300" y="40" width="50" height="380" fill={`url(#${uid(variant, 'asphalt')})`} />
        <rect x="40" y="200" width="640" height="36" fill={`url(#${uid(variant, 'asphalt')})`} />

        {/* Anchor hypermarket */}
        <rect x="60" y="60" width="210" height="120" rx="8" fill={built ? '#fdba74' : '#e7e5e4'} stroke="#ea580c" strokeWidth="3" />
        {built && (
          <g>
            <rect x="80" y="80" width="170" height="80" fill={`url(#${uid(variant, 'roofB')})`} />
            <text x="110" y="125" fill="#78350f" fontSize="14" fontWeight="800">
              HYPERMARKET
            </text>
          </g>
        )}

        {/* Atrium */}
        <rect x="380" y="60" width="260" height="120" rx="8" fill={built ? '#fde68a' : '#e7e5e4'} stroke="#b45309" strokeWidth="3" />
        {atrium && (
          <g>
            <ellipse cx="510" cy="120" rx="70" ry="40" fill="none" stroke="#0ea5e9" strokeWidth="4" />
            <ellipse cx="510" cy="120" rx="40" ry="22" fill="#38bdf8" opacity="0.5" />
            <text x="470" y="125" fill="#0c4a6e" fontSize="11" fontWeight="800">
              KOI ATRIUM
            </text>
          </g>
        )}

        {/* Cinema */}
        <rect x="60" y="260" width="200" height="140" rx="8" fill={built ? '#fecaca' : '#e7e5e4'} stroke="#c2410c" strokeWidth="3" />
        {cinema && (
          <g>
            <rect x="90" y="285" width="140" height="90" fill="#7f1d1d" />
            <rect x="100" y="295" width="120" height="50" fill="#111" stroke="#f87171" strokeWidth="2" transform="rotate(-11 160 320)" />
            <text x="95" y="375" fill="#7f1d1d" fontSize="11" fontWeight="800">
              IMAX · 11° REDO
            </text>
          </g>
        )}

        {/* Basement / parking roof */}
        <rect x="300" y="260" width="200" height="70" rx="8" fill={built ? '#a8a29e' : '#e7e5e4'} stroke="#9a3412" strokeWidth="3" />
        {built && (
          <text x="330" y="300" fill="#1c1917" fontSize="12" fontWeight="800">
            B1–B3 PARKING
          </text>
        )}

        {/* Rooftop fun */}
        <rect x="520" y="260" width="140" height="140" rx="8" fill={built ? '#fef3c7' : '#e7e5e4'} stroke="#f59e0b" strokeWidth="3" />
        {roof ? (
          <g>
            <circle cx="590" cy="320" r="28" fill="none" stroke="#ea580c" strokeWidth="4" strokeDasharray="6 4" />
            <text x="545" y="375" fill="#92400e" fontSize="10" fontWeight="800">
              FUN ZONE 18%
            </text>
          </g>
        ) : (
          built && (
            <text x="545" y="335" fill="#78716c" fontSize="11" fontWeight="700">
              gravel only
            </text>
          )
        )}

        {!built && (
          <text x="200" y="180" fill="#78716c" fontSize="13" fontWeight="700" opacity="0.8">
            Mall footprint staked · no massing yet
          </text>
        )}

        <rect x="28" y="8" width="280" height="18" rx="4" fill="rgba(15,23,42,0.8)" />
        <text x="38" y="21" fill="#fdba74" fontSize="10" fontWeight="700">
          {built
            ? `MALL ORTHO · MOCK · M${missionIndex} · build ${Math.round(level * 100)}%`
            : 'MALL ORTHO · BASELINE · MOCK PLAN'}
        </text>
      </svg>
    </div>
  )
}

/** Cartoon society aerial — Lakeview Residences demo. */
export function SocietyOrthoScene({
  variant,
  missionIndex,
}: {
  variant: Variant
  missionIndex: number
}) {
  const built = variant === 'after'
  const wingA = built ? Math.max(1, missionIndex + 1) : 0
  const wingB = built ? Math.max(0, missionIndex - 1) : 0
  const club = built && missionIndex >= 2
  const hA = wingA * 18
  const hB = wingB * 18

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#6ee7b7]">
      <svg className="h-full w-full" viewBox="0 0 720 460" preserveAspectRatio="xMidYMid meet">
        <AerialDefs variant={variant} />
        <rect width="720" height="460" fill={`url(#${uid(variant, 'soil')})`} />

        <rect x="36" y="36" width="648" height="388" rx="12" fill="none" stroke="rgba(6,95,70,0.45)" strokeWidth="3" strokeDasharray="10 6" />
        <ellipse cx="360" cy="380" rx="220" ry="28" fill="#0ea5e9" opacity="0.25" />

        {/* Wing A */}
        <rect x="70" y="70" width="200" height="220" rx="10" fill={built ? 'rgba(167,243,208,0.7)' : '#e7e5e4'} stroke="#059669" strokeWidth="3" />
        {built && wingA > 0 && (
          <g filter={`url(#${uid(variant, 'shadow')})`}>
            <rect x="110" y={260 - hA} width="50" height={hA} fill={`url(#${uid(variant, 'roofC')})`} stroke="#065f46" />
            <rect x="180" y={260 - hA * 0.92} width="50" height={hA * 0.92} fill={`url(#${uid(variant, 'roofC')})`} stroke="#065f46" />
            <text x="100" y="290" fill="#064e3b" fontSize="12" fontWeight="800">
              NORTH · L{wingA}
            </text>
          </g>
        )}

        {/* Wing B — lagging / sunk pad */}
        <rect x="420" y="70" width="200" height="220" rx="10" fill={built ? 'rgba(254,226,226,0.55)' : '#e7e5e4'} stroke="#047857" strokeWidth="3" />
        {built && (
          <g>
            <ellipse cx="520" cy="250" rx="70" ry="22" fill="#7f1d1d" opacity="0.35" />
            {wingB > 0 ? (
              <rect x="480" y={250 - hB} width="55" height={hB} fill={`url(#${uid(variant, 'roofA')})`} stroke="#0c4a6e" />
            ) : (
              <text x="455" y="180" fill="#991b1b" fontSize="12" fontWeight="800">
                PAD SUNK 40cm
              </text>
            )}
            <text x="450" y="290" fill="#064e3b" fontSize="12" fontWeight="800">
              SOUTH · L{wingB}
            </text>
          </g>
        )}

        {/* Club lagoon */}
        <rect x="70" y="320" width="280" height="90" rx="10" fill={built ? '#a7f3d0' : '#e7e5e4'} stroke="#10b981" strokeWidth="3" />
        {club && (
          <g>
            <ellipse cx="160" cy="365" rx="55" ry="22" fill="#f9a8d7" stroke="#be185d" strokeWidth="2" />
            <text x="220" y="370" fill="#065f46" fontSize="11" fontWeight="800">
              PINK POOL FORMS
            </text>
          </g>
        )}

        {/* EV podium */}
        <rect x="380" y="320" width="240" height="90" rx="10" fill={built ? '#d1fae5' : '#e7e5e4'} stroke="#34d399" strokeWidth="3" />
        {built && (
          <text x="420" y="370" fill="#065f46" fontSize="12" fontWeight="800">
            EV FOREST · 14% · +47 pts
          </text>
        )}

        {!built && (
          <text x="220" y="200" fill="#065f46" fontSize="13" fontWeight="700" opacity="0.75">
            Twin pads staked · soft pocket flagged under South
          </text>
        )}

        <rect x="28" y="8" width="300" height="18" rx="4" fill="rgba(15,23,42,0.8)" />
        <text x="38" y="21" fill="#6ee7b7" fontSize="10" fontWeight="700">
          {built
            ? `SOCIETY ORTHO · MOCK · M${missionIndex}`
            : 'SOCIETY ORTHO · BASELINE · MOCK PLAN'}
        </text>
      </svg>
    </div>
  )
}

export function DemSurveyScene({
  variant,
  missionIndex,
}: {
  variant: Variant
  missionIndex: number
}) {
  const cut = variant === 'after' ? 18 + missionIndex * 4 : 8
  const id = (n: string) => uid(variant, n)
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="h-full w-full" viewBox="0 0 720 460" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={id('demRamp')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="30%" stopColor="#4ade80" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <radialGradient id={id('hillA')} cx="28%" cy="32%" r="48%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id('hillB')} cx="78%" cy="72%" r="42%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="720" height="460" fill={`url(#${id('demRamp')})`} />
        <rect width="720" height="460" fill={`url(#${id('hillA')})`} />
        <rect width="720" height="460" fill={`url(#${id('hillB')})`} />
        {[70, 120, 170, 220, 270, 320, 370].map((y, i) => (
          <path
            key={y}
            d={`M0 ${y} C 180 ${y - cut + i * 2} 400 ${y + cut - i} 720 ${y - 4}`}
            fill="none"
            stroke="rgba(15,23,42,0.32)"
            strokeWidth="1.4"
          />
        ))}
        {variant === 'after' && (
          <>
            <ellipse cx="520" cy="340" rx={48 + missionIndex * 4} ry={26} fill="rgba(127,29,29,0.4)" />
            <ellipse cx="160" cy="120" rx={36 + missionIndex * 2} ry={22} fill="rgba(254,243,199,0.45)" />
          </>
        )}
        <rect x="20" y="16" width="220" height="22" rx="5" fill="rgba(15,23,42,0.72)" />
        <text x="30" y="32" fill="#fff" fontSize="11" fontWeight="700">
          DEM · {variant === 'after' ? 'CURRENT ELEVATION' : 'BASELINE TERRAIN'}
        </text>
        <rect x="560" y="400" width="140" height="44" rx="8" fill="rgba(255,255,255,0.88)" />
        <text x="574" y="420" fontSize="9" fontWeight="700" fill="#334155">
          Low → High elev.
        </text>
        <rect x="574" y="426" width="112" height="10" rx="3" fill={`url(#${id('demRamp')})`} />
      </svg>
    </div>
  )
}

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { cn, statusLabel } from '@/shared/lib/utils'
import type { Zone } from '@/entities/types'
import { buildAreaBreakdown } from '@/features/dashboard/areaBreakdown'

const COLORS = {
  completed: '#2563eb',
  inProgress: '#f97316',
  notStarted: '#cbd5e1',
}

export function SiteProgressBreakdown({
  zones,
  totalAcres,
  className,
}: {
  zones: Zone[]
  totalAcres: number
  className?: string
}) {
  const b = buildAreaBreakdown(zones, totalAcres)
  const share = totalAcres / Math.max(1, zones.length)

  const statusCards = [
    {
      name: 'Completed',
      pct: b.completedPct,
      acres: b.completedAcres,
      color: COLORS.completed,
      tone: 'done' as const,
    },
    {
      name: 'In progress',
      pct: b.inProgressPct,
      acres: b.inProgressAcres,
      color: COLORS.inProgress,
      tone: 'active' as const,
    },
    {
      name: 'Not started',
      pct: b.notStartedPct,
      acres: b.remainingAcres,
      color: COLORS.notStarted,
      tone: 'idle' as const,
    },
  ]

  const pieData = [
    { name: 'Completed', value: Math.max(b.completedAcres, 0.0001), key: 'completed' as const },
    { name: 'In Progress', value: Math.max(b.inProgressAcres, 0.0001), key: 'inProgress' as const },
    { name: 'Not Started', value: Math.max(b.remainingAcres, 0.0001), key: 'notStarted' as const },
  ]

  return (
    <div className={cn('site-progress-panel', className)}>
      <div className="spb-top">
        <div className="spb-chart-block">
          <div className="spb-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="86%"
                  paddingAngle={1.5}
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={COLORS[entry.key]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="spb-chart__center">
              <strong>{b.overallPct}%</strong>
              <span>Overall</span>
            </div>
          </div>

          <div className="spb-status-cards">
            {statusCards.map((row) => (
              <div key={row.name} className={cn('spb-status', `spb-status--${row.tone}`)}>
                <div className="spb-status__head">
                  <span className="spb-status__dot" style={{ background: row.color }} />
                  <span>{row.name}</span>
                </div>
                <strong>{row.pct}%</strong>
                <em>{row.acres.toFixed(1)} acres</em>
                <div className="spb-status__bar">
                  <i style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="spb-zones">
          <div className="spb-zones__head">
            <h4>Zone mix</h4>
            <span>{zones.length} packages · ~{share.toFixed(1)} ac each</span>
          </div>
          <ul className="spb-zone-list">
            {zones.map((z) => (
              <li key={z.id}>
                <div className="spb-zone__top">
                  <span className="spb-zone__code" style={{ background: z.color }}>
                    {z.code}
                  </span>
                  <div className="spb-zone__copy">
                    <strong>{z.name}</strong>
                    <em>{z.type}</em>
                  </div>
                  <div className="spb-zone__right">
                    <strong>{z.overallProgress}%</strong>
                    <em>{statusLabel(z.scheduleStatus)}</em>
                  </div>
                </div>
                <div className="spb-zone__track">
                  <span
                    style={{
                      width: `${Math.min(100, z.overallProgress)}%`,
                      background: z.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="spb-acres">
        <div className="spb-acre">
          <span>Total</span>
          <strong>{b.totalAcres.toFixed(1)}</strong>
          <em>acres</em>
        </div>
        <div className="spb-acre spb-acre--done">
          <span>Completed</span>
          <strong>{b.completedAcres.toFixed(1)}</strong>
          <em>acres</em>
        </div>
        <div className="spb-acre spb-acre--active">
          <span>In progress</span>
          <strong>{b.inProgressAcres.toFixed(1)}</strong>
          <em>acres</em>
        </div>
        <div className="spb-acre spb-acre--idle">
          <span>Remaining</span>
          <strong>{b.remainingAcres.toFixed(1)}</strong>
          <em>acres</em>
        </div>
      </div>
    </div>
  )
}

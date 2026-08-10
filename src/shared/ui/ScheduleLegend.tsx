import type { ScheduleStatus } from '@/entities/types'
import { statusLabel } from '@/shared/lib/utils'

const ITEMS: ScheduleStatus[] = ['completed', 'on_track', 'behind']

/** Compact key for schedule colors used across the workspace */
export function ScheduleLegend({ className }: { className?: string }) {
  return (
    <div className={className ? `schedule-legend ${className}` : 'schedule-legend'} aria-label="Schedule color key">
      {ITEMS.map((id) => (
        <span key={id} className="schedule-legend__item">
          <span className={`schedule-legend__swatch schedule-legend__swatch--${id}`} />
          {statusLabel(id)}
        </span>
      ))}
    </div>
  )
}

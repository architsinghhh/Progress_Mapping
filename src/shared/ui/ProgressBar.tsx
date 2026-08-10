import { cn, statusColor } from '@/shared/lib/utils'
import { motion } from 'framer-motion'
import type { ScheduleStatus } from '@/entities/types'

interface ProgressBarProps {
  value: number
  planned?: number
  /** Zone accent — ignored when `status` is set (schedule color wins). */
  color?: string
  /** Fill bar with schedule palette (Completed / On Schedule / Behind). */
  status?: ScheduleStatus
  className?: string
  showLabel?: boolean
}

export function ProgressBar({
  value,
  planned,
  color,
  status,
  className,
  showLabel = true,
}: ProgressBarProps) {
  const fill = status ? statusColor(status) : color

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-[11px] text-[#64748b]">
          <span>Onsite {value}%</span>
          {planned != null && <span>Plan {planned}%</span>}
        </div>
      )}
      <div className="progress-track">
        {planned != null && (
          <div className="progress-planned" style={{ width: `${Math.min(100, planned)}%` }} />
        )}
        <motion.div
          className="progress-fill"
          style={fill ? { background: fill } : undefined}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

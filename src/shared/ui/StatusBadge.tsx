import { cn, statusLabel } from '@/shared/lib/utils'
import type { ScheduleStatus } from '@/entities/types'

/** Fallback when a behind item has no authored remark. */
export function behindFallbackRemark(label?: string): string {
  return label
    ? `${label} lagging plan — check forecast`
    : 'Behind schedule — check forecast'
}

export function StatusBadge({
  status,
  remark,
  className,
  compact,
}: {
  status: ScheduleStatus
  remark?: string
  className?: string
  /** Hide remark text (e.g. when a dedicated Remark column exists) */
  compact?: boolean
}) {
  const note =
    !compact && status === 'behind'
      ? remark?.trim() || behindFallbackRemark()
      : !compact
        ? remark?.trim() || undefined
        : undefined

  return (
    <span className={cn('inline-flex max-w-full flex-col items-start gap-0.5', className)}>
      <span className={cn('status-badge', `status-${status}`)}>
        <span className="status-badge__dot" />
        {statusLabel(status)}
      </span>
      {note ? (
        <span
          className={cn(
            'max-w-[13rem] text-left text-[10px] leading-snug font-medium',
            status === 'behind' ? 'text-red-600' : 'text-slate-500',
          )}
        >
          {note}
        </span>
      ) : null}
    </span>
  )
}

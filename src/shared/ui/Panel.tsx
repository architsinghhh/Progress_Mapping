import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  accent?: 'sky' | 'blue' | 'gold' | 'mint' | 'coral' | 'indigo'
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
  accent = 'gold',
}: PanelProps) {
  return (
    <section className={cn('panel', `panel--${accent}`, className)}>
      <div className="panel-header">
        <h2 className="panel-title">
          <span className="panel-title__dot" />
          {title}
        </h2>
        {action}
      </div>
      <div className={cn('relative z-[1] min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

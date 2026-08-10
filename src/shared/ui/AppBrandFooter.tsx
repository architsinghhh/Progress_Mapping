import { AJNHAWK_COPYRIGHT, AJNHAWK_TAGLINE } from '@/shared/lib/branding'
import { AjnhawkLogo } from '@/shared/ui/AjnhawkLogo'
import { cn } from '@/shared/lib/utils'

type Props = {
  className?: string
  compact?: boolean
  onLogoClick?: () => void
}

export function AppBrandFooter({ className = '', compact = false, onLogoClick }: Props) {
  return (
    <footer
      className={cn('app-brand-footer', compact && 'app-brand-footer--compact', className)}
    >
      <AjnhawkLogo
        size={compact ? 'sm' : 'md'}
        onClick={onLogoClick}
        title={onLogoClick ? 'All project sites' : undefined}
      />
      <div className="app-brand-footer__text">
        <p className="app-brand-footer__copy">{AJNHAWK_COPYRIGHT}</p>
        {!compact ? <p className="app-brand-footer__tag">{AJNHAWK_TAGLINE}</p> : null}
      </div>
    </footer>
  )
}

import { AJNHAWK_COMPANY_NAME, AJNHAWK_LOGO_SRC } from '@/shared/lib/branding'
import { cn } from '@/shared/lib/utils'

type Size = 'sm' | 'md' | 'lg'

const sizeClass: Record<Size, string> = {
  sm: 'ajnhawk-logo--sm',
  md: 'ajnhawk-logo--md',
  lg: 'ajnhawk-logo--lg',
}

type Props = {
  size?: Size
  className?: string
  padded?: boolean
  /** When set, logo is a button (e.g. navigate home). */
  onClick?: () => void
  title?: string
}

export function AjnhawkLogo({
  size = 'md',
  className = '',
  padded = false,
  onClick,
  title,
}: Props) {
  const classes = cn(
    'ajnhawk-logo',
    sizeClass[size],
    padded && 'ajnhawk-logo--padded',
    onClick && 'ajnhawk-logo--button',
    className,
  )
  const img = (
    <img src={AJNHAWK_LOGO_SRC} alt={AJNHAWK_COMPANY_NAME} className="ajnhawk-logo__img" decoding="async" />
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} title={title ?? AJNHAWK_COMPANY_NAME}>
        {img}
      </button>
    )
  }

  return <span className={classes}>{img}</span>
}

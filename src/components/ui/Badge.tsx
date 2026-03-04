import type { HTMLAttributes } from 'react'

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-neutral-200 text-neutral-700',
  primary:  'bg-brand-50 text-brand-700',
  success:  'bg-success-100 text-success-700',
  warning:  'bg-warning-50 text-warning-700',
  danger:   'bg-danger-100 text-danger-700',
  info:     'bg-brand-100 text-brand-700',
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}

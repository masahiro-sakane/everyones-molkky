import { forwardRef, type ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'subtle' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  iconBefore?: React.ReactNode
  iconAfter?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-neutral-0 hover:bg-brand-600 active:bg-brand-700 disabled:bg-neutral-300 disabled:text-neutral-500',
  secondary:
    'bg-neutral-0 text-neutral-700 border border-neutral-400 hover:bg-neutral-100 active:bg-neutral-200 disabled:border-neutral-300 disabled:text-neutral-400',
  danger:
    'bg-danger-500 text-neutral-0 hover:bg-danger-600 active:bg-danger-700 disabled:bg-neutral-300 disabled:text-neutral-500',
  subtle:
    'bg-transparent text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 disabled:text-neutral-400',
  link:
    'bg-transparent text-brand-500 hover:text-brand-600 hover:underline active:text-brand-700 disabled:text-neutral-400 p-0',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-10 px-4 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      iconBefore,
      iconAfter,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium rounded-md',
          'transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
          'disabled:cursor-not-allowed',
          variant !== 'link' ? sizeClasses[size] : '',
          variantClasses[variant],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {isLoading ? (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          iconBefore && <span aria-hidden="true">{iconBefore}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && iconAfter && <span aria-hidden="true">{iconAfter}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

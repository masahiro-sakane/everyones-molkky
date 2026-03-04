import { forwardRef, type InputHTMLAttributes } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  isRequired?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, isRequired, id, className = '', ...props }, ref) => {
    const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-')}`
    const hasError = !!error

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-800"
          >
            {label}
            {isRequired && (
              <span className="ml-0.5 text-danger-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-required={isRequired}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={[
            'h-8 px-3 rounded-md text-sm',
            'bg-neutral-0 text-neutral-900',
            'border transition-colors duration-150',
            hasError
              ? 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-200'
              : 'border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
            'outline-none placeholder:text-neutral-400',
            'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {hasError && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-danger-600">
            {error}
          </p>
        )}
        {!hasError && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-neutral-500">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

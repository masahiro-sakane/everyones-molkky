import { forwardRef, type SelectHTMLAttributes } from 'react'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  hint?: string
  isRequired?: boolean
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      isRequired,
      options,
      placeholder,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const selectId = id ?? `select-${label?.toLowerCase().replace(/\s+/g, '-')}`
    const hasError = !!error

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-neutral-800">
            {label}
            {isRequired && (
              <span className="ml-0.5 text-danger-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-required={isRequired}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            className={[
              'h-8 w-full pl-3 pr-8 rounded-md text-sm appearance-none',
              'bg-neutral-0 text-neutral-900',
              'border transition-colors duration-150',
              hasError
                ? 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-200'
                : 'border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
              'outline-none',
              'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Chevron icon */}
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg
              className="w-4 h-4 text-neutral-500"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </div>
        </div>
        {hasError && (
          <p id={`${selectId}-error`} role="alert" className="text-xs text-danger-600">
            {error}
          </p>
        )}
        {!hasError && hint && (
          <p id={`${selectId}-hint`} className="text-xs text-neutral-500">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

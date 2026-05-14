'use client'

export type ViewMode = 'sheet' | 'card'

type ViewToggleProps = {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

/**
 * スコアシートビューとカードビューの切替トグル
 */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      className="inline-flex gap-1 p-1 bg-neutral-100 rounded-md"
      role="tablist"
      aria-label="表示モード"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'sheet'}
        onClick={() => onChange('sheet')}
        data-testid="view-toggle-sheet"
        className={[
          'px-3 py-1.5 text-xs font-medium rounded transition-colors',
          value === 'sheet'
            ? 'bg-neutral-0 text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-700',
        ].join(' ')}
      >
        スコアシート
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'card'}
        onClick={() => onChange('card')}
        data-testid="view-toggle-card"
        className={[
          'px-3 py-1.5 text-xs font-medium rounded transition-colors',
          value === 'card'
            ? 'bg-neutral-0 text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-700',
        ].join(' ')}
      >
        カード
      </button>
    </div>
  )
}

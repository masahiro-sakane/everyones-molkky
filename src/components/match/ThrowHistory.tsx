type ThrowEntry = {
  id: string
  score: number
  skittlesKnocked: number[]
  isFault: boolean
  faultType: string | null
  user: { name: string } | null
  teamName: string
  createdAt: Date | string
}

type ThrowHistoryProps = {
  throws: ThrowEntry[]
}

function formatFaultType(faultType: string | null): string {
  switch (faultType) {
    case 'MISS':
      return 'ミス'
    case 'DROP':
      return 'ドロップ'
    case 'STEP_OVER':
      return '踏み越え'
    case 'WRONG_ORDER':
      return '順番違い'
    default:
      return 'フォルト'
  }
}

export function ThrowHistory({ throws }: ThrowHistoryProps) {
  if (throws.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-neutral-400">
        まだ投擲がありません
      </div>
    )
  }

  const reversed = [...throws].reverse()

  return (
    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
      {reversed.map((t, index) => (
        <div
          key={t.id}
          className={[
            'flex items-center justify-between px-3 py-2 rounded-md text-sm',
            index === 0 ? 'bg-brand-50 border border-brand-200' : 'bg-neutral-50',
          ].join(' ')}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-neutral-700 truncate">
              {t.user?.name ?? '不明'}
            </span>
            <span className="text-xs text-neutral-400 shrink-0">{t.teamName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {t.isFault ? (
              <span className="text-xs text-danger-600 font-medium">
                {t.faultType ? formatFaultType(t.faultType) : 'フォルト'}
              </span>
            ) : t.skittlesKnocked.length === 0 ? (
              <span className="text-xs text-neutral-400">ミス</span>
            ) : (
              <span className="text-xs text-neutral-500">
                [{t.skittlesKnocked.join(', ')}]
              </span>
            )}
            <span
              className={[
                'font-bold tabular-nums',
                t.score > 0 ? 'text-neutral-900' : 'text-neutral-400',
              ].join(' ')}
            >
              {t.score > 0 ? `+${t.score}` : t.score}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

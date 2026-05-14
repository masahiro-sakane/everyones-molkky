'use client'

import type { ScoreSheetCell as Cell } from '@/types/scoreSheet'

type ScoreSheetCellProps = {
  cell: Cell
  /** 現在投擲セルとしてハイライトするか */
  isCurrent?: boolean
  /** クリック可能（編集モード用、Phase 2予約） */
  onClick?: () => void
  /** 列の失格状態 */
  isTeamDisqualified?: boolean
}

/**
 * スコアシートの1セル
 *
 * 表示パターン:
 *  - empty:    空セル
 *  - pending:  現在投擲中（ハイライト）
 *  - miss:     ─
 *  - fault:    F
 *  - score:    得点数字
 *  - goal:     ○で囲んだ50
 *  - reset:    数字 + ↩マーク（50超リセット）
 *  - disqualified: グレーアウト
 */
export function ScoreSheetCell({
  cell,
  isCurrent = false,
  onClick,
  isTeamDisqualified = false,
}: ScoreSheetCellProps) {
  const baseClass = [
    'relative h-9 min-w-[2.5rem] border-r border-neutral-200',
    'text-center align-middle',
    'text-sm tabular-nums',
    'transition-colors',
  ]

  // 失格セルは常にグレー
  if (isTeamDisqualified && cell.value.kind !== 'score' && cell.value.kind !== 'goal') {
    baseClass.push('bg-neutral-100 text-neutral-300')
  }

  // 現在投擲セル
  if (isCurrent) {
    baseClass.push('bg-brand-100 ring-2 ring-brand-500 ring-inset z-10 font-bold')
  }

  return (
    <td
      className={baseClass.join(' ')}
      data-testid={`cell-${cell.teamId}-${cell.throwIndex}`}
      aria-current={isCurrent ? 'true' : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
<CellContent value={cell.value} />
    </td>
  )
}

function CellContent({ value }: { value: Cell['value'] }) {
  switch (value.kind) {
    case 'empty':
      return <span className="text-transparent">·</span>
    case 'pending':
      return <span className="text-brand-500">…</span>
    case 'miss':
      return (
        <span className="text-neutral-500" aria-label="ミス（0点）">
          ─
        </span>
      )
    case 'fault':
      return (
        <span
          className="text-danger-600 font-medium text-xs"
          aria-label={`フォルト: ${value.faultType}`}
          title={`フォルト: ${value.faultType}`}
        >
          F
        </span>
      )
    case 'score':
      return <span className="font-medium text-neutral-900">{value.n}</span>
    case 'goal':
      return (
        <span
          className="relative inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-danger-500 text-danger-600 font-bold text-xs"
          aria-label="ゴール（50点到達）"
          title="ゴール（50点ちょうど）"
        >
          50
        </span>
      )
    case 'reset':
      return (
        <span
          className="text-warning-700 font-medium"
          aria-label={`50超過のため25にリセット（${value.score}点投擲）`}
          title={`${value.score}点投擲 → 50超過で25にリセット`}
        >
          {value.score}
        </span>
      )
    case 'disqualified':
      return <span className="text-neutral-300">×</span>
  }
}

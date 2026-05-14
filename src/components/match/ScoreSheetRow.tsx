'use client'

import { memo } from 'react'
import type { ScoreSheetRow as Row, TeamColumn, CurrentCellPosition } from '@/types/scoreSheet'
import { ScoreSheetCell } from './ScoreSheetCell'

type ScoreSheetRowProps = {
  row: Row
  columns: TeamColumn[]
  currentCell: CurrentCellPosition | null
}

/**
 * スコアシートの1行
 * 構造: [行番号] [チームA: mem1, mem2, ..., 計] [チームB: ..., 計] ...
 */
export const ScoreSheetRow = memo(function ScoreSheetRow({
  row,
  columns,
  currentCell,
}: ScoreSheetRowProps) {
  return (
    <tr className="border-b border-neutral-200">
      {/* 行番号列 */}
      <td
        className="sticky left-0 z-10 bg-neutral-50 border-r border-neutral-300 px-2 text-xs text-neutral-500 italic text-center min-w-[2.5rem] font-medium"
        scope="row"
      >
        {row.rowIndex}
      </td>

      {columns.map((col) => {
        const cells = row.cellsByTeam.get(col.teamId) ?? []
        const cumulative = row.cumulativeByTeam.get(col.teamId)

        // 計列表示: その行に投擲データがある場合のみ
        const hasThrow = cumulative?.hasThrowInRow ?? false

        return (
          <TeamRowSection
            key={col.teamId}
            column={col}
            cells={cells}
            cumulative={cumulative}
            currentCell={currentCell}
            rowIndex={row.rowIndex}
            hasThrow={hasThrow}
          />
        )
      })}
    </tr>
  )
})

type TeamRowSectionProps = {
  column: TeamColumn
  cells: ReturnType<Row['cellsByTeam']['get']> extends infer T ? Exclude<T, undefined> : never
  cumulative: ReturnType<Row['cumulativeByTeam']['get']>
  currentCell: CurrentCellPosition | null
  rowIndex: number
}

function TeamRowSection({
  column,
  cells,
  cumulative,
  currentCell,
  rowIndex,
  hasThrow,
}: TeamRowSectionProps & { hasThrow: boolean }) {
  return (
    <>
      {cells.map((cell, i) => {
        const isCurrent =
          currentCell !== null &&
          currentCell.rowIndex === rowIndex &&
          currentCell.teamId === column.teamId &&
          currentCell.userId === cell.userId &&
          cell.value.kind === 'empty'

        return (
          <ScoreSheetCell
            key={`${column.teamId}-${i}`}
            cell={cell}
            isCurrent={isCurrent}
            isTeamDisqualified={column.isDisqualified}
          />
        )
      })}
      {/* 計列: ラウンド最終行（全メンバーが投げ終わった行）にだけ値を表示 */}
      <td
        className={[
          'h-9 min-w-[3rem] border-r-2 border-neutral-400 bg-neutral-50',
          'text-center text-sm font-bold tabular-nums',
          column.isDisqualified ? 'text-neutral-400' : 'text-neutral-900',
          cumulative?.isWinner ? 'text-success-700' : '',
          cumulative?.hasReset ? 'text-warning-700' : '',
        ].join(' ')}
        data-testid={`total-${column.teamId}-row-${rowIndex}`}
      >
        {hasThrow && cumulative ? cumulative.total : ''}
        {hasThrow && cumulative?.hasReset && (
          <span className="text-[10px] ml-0.5" title="50超過でリセット">
            ↩
          </span>
        )}
      </td>
    </>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import type { ScoreSheetData } from '@/types/scoreSheet'
import { ScoreSheetTeamHeader } from './ScoreSheetTeamHeader'
import { ScoreSheetRow } from './ScoreSheetRow'

type ScoreSheetViewProps = {
  data: ScoreSheetData
  /** タイトル（ヘッダー上部に表示） */
  title?: string
  /** 試合日（ヘッダー右に表示） */
  matchDate?: string
  /** 記録済みセルをクリックしたときのコールバック */
  onEditCell?: (throwId: string, skittles: number[], rect: DOMRect) => void
  /** 編集中の throwId（ハイライト用） */
  editingThrowId?: string | null
}


/**
 * スコアシート全体ビュー（紙のスコア表を模した2D表）
 */
export function ScoreSheetView({
  data,
  title = 'モルック得点表',
  matchDate,
  onEditCell,
  editingThrowId,
}: ScoreSheetViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 現在投擲セルへ自動スクロール
  // debounce: 楽観的更新→サーバー同期の2段階更新によるちらつきを防ぐ
  const currentRowIndex = data.currentCell?.rowIndex
  const currentTeamId = data.currentCell?.teamId
  useEffect(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      if (!currentRowIndex || !scrollContainerRef.current) return
      const container = scrollContainerRef.current
      const el = container.querySelector<HTMLElement>('[aria-current="true"]')
      if (!el) return
      // テーブル内の水平スクロールのみ行い、ページ縦スクロールは触らない
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scrollLeft = container.scrollLeft + elRect.left - containerRect.left - containerRect.width / 2 + elRect.width / 2
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
    }, 80)
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [currentRowIndex, currentTeamId])

  return (
    <div className="flex flex-col gap-3">
      {/* スコアシート本体 */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto border border-neutral-300 rounded-md bg-neutral-0"
      >
        <table
          role="grid"
          aria-label="スコアシート"
          className="w-full border-collapse"
        >
          <ScoreSheetTeamHeader columns={data.columns} />
          <tbody>
            {data.rows.map((row) => (
              <ScoreSheetRow
                key={row.rowIndex}
                row={row}
                columns={data.columns}
                currentCell={data.currentCell}
                onEditCell={onEditCell}
                editingThrowId={editingThrowId}
              />
            ))}

            {/* 合計行（ラベル + 値の2セット） */}
            <tr className="bg-neutral-100 border-t-2 border-neutral-400">
              <td
                className="sticky left-0 z-10 bg-neutral-100 border-r border-neutral-300 px-2 py-2 text-xs text-neutral-600 font-bold text-center"
                scope="row"
              >
                合計
              </td>
              {data.columns.map((col) => {
                const total =
                  data.rows.at(-1)?.cumulativeByTeam.get(col.teamId)?.total ?? 0
                return (
                  <TotalRowSection
                    key={col.teamId}
                    teamId={col.teamId}
                    columnSpan={col.members.length}
                    total={total}
                    isWinner={col.isWinner}
                    isDisqualified={col.isDisqualified}
                  />
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}

function TotalRowSection({
  teamId,
  columnSpan,
  total,
  isWinner,
  isDisqualified,
}: {
  teamId: string
  columnSpan: number
  total: number
  isWinner: boolean
  isDisqualified: boolean
}) {
  return (
    <>
      <td
        colSpan={columnSpan}
        className="px-2 py-2 text-right text-xs text-neutral-500 border-r border-neutral-200"
      >
        合計
      </td>
      <td
        className={[
          'px-2 py-2 text-center text-lg font-bold border-r-2 border-neutral-400 tabular-nums',
          isWinner ? 'text-success-700' : '',
          isDisqualified ? 'line-through text-neutral-400' : 'text-neutral-900',
        ].join(' ')}
        data-testid={`grand-total-${teamId}`}
      >
        {total}
      </td>
    </>
  )
}

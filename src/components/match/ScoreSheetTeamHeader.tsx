'use client'

import type { TeamColumn, TeamRanking } from '@/types/scoreSheet'
import { Badge } from '@/components/ui/Badge'

type ScoreSheetTeamHeaderProps = {
  columns: TeamColumn[]
  rankings?: TeamRanking[]
}

/**
 * スコアシートの2段ヘッダー
 * 1段目: チーム名 + 順位バッジ（A: チームA / B: チームB ...）
 * 2段目: メンバー名（投擲順番号 + 名前）+ 計列
 */
export function ScoreSheetTeamHeader({ columns, rankings = [] }: ScoreSheetTeamHeaderProps) {
  const rankMap = new Map(rankings.map((r) => [r.teamId, r.rank]))
  return (
    <thead className="sticky top-0 z-20 bg-neutral-0">
      {/* チーム名行 */}
      <tr className="border-b border-neutral-300">
        <th
          scope="col"
          className="sticky left-0 z-30 bg-neutral-50 border-r border-neutral-300 px-2 text-xs text-neutral-500 font-medium min-w-[2.5rem] py-2"
          rowSpan={2}
        >
          チーム
          <br />
          名前
        </th>
        {columns.map((col) => {
          const memberCount = col.members.length
          const colSpan = memberCount + 1 // メンバー数 + 計列
          return (
            <th
              key={col.teamId}
              scope="colgroup"
              colSpan={colSpan}
              className={[
                'border-r-2 border-neutral-400 px-2 py-1 text-center',
                col.isDisqualified ? 'bg-neutral-100' : '',
                col.isWinner ? 'bg-success-50' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {(() => {
                  const rank = rankMap.get(col.teamId)
                  if (rank === undefined) return null
                  return (
                    <span className={[
                      'inline-flex items-center justify-center w-8 h-5 rounded-full text-[10px] font-bold shrink-0',
                      rank === 1 ? 'bg-warning-100 text-warning-700 border border-warning-400' : 'bg-neutral-200 text-neutral-600',
                    ].join(' ')}>
                      {rank}位
                    </span>
                  )
                })()}
                <span
                  className={[
                    'text-sm font-bold truncate',
                    col.isDisqualified ? 'line-through text-neutral-400' : 'text-neutral-900',
                  ].join(' ')}
                >
                  {col.teamName}
                </span>
                {col.isWinner && <Badge variant="success">優勝</Badge>}
                {col.isDisqualified && <Badge variant="danger">失格</Badge>}
              </div>
            </th>
          )
        })}
      </tr>

      {/* メンバー名行 */}
      <tr className="border-b border-neutral-300 bg-neutral-50">
        {columns.flatMap((col) => {
          const cells = [
            ...col.members.map((m, mi) => (
              <th
                key={`${col.teamId}-mem-${mi}`}
                scope="col"
                className="border-r border-neutral-200 px-1 py-1 text-xs font-normal text-neutral-700 min-w-[2.5rem] align-top"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-neutral-400">{mi + 1}</span>
                  {m.userId && (
                    <span
                      className="font-medium writing-mode-vertical"
                      style={{ writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}
                      title={m.userName}
                    >
                      {m.userName}
                    </span>
                  )}
                </div>
              </th>
            )),
            <th
              key={`${col.teamId}-sum`}
              scope="col"
              className="border-r-2 border-neutral-400 px-1 py-1 text-xs font-bold text-neutral-700 min-w-[3rem] bg-neutral-100"
            >
              計
            </th>,
          ]
          return cells
        })}
      </tr>
    </thead>
  )
}

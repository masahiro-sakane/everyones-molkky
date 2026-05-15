import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreSheetView } from '../ScoreSheetView'
import type { ScoreSheetData, TeamColumn } from '@/types/scoreSheet'

function buildEmptyData(opts: {
  teams: Array<{ id: string; name: string; members: string[] }>
}): ScoreSheetData {
  const columns: TeamColumn[] = opts.teams.map((t, i) => ({
    teamId: t.id,
    teamName: t.name,
    order: i + 1,
    members: t.members.map((m, mi) => ({
      userId: `${t.id}-m${mi + 1}`,
      userName: m,
    })),
    isDisqualified: false,
    isWinner: false,
  }))

  return {
    columns,
    rows: [
      {
        rowIndex: 1,
        cellsByTeam: new Map(
          columns.map((c) => [
            c.teamId,
            c.members.map((m, mi) => ({
              teamId: c.teamId,
              userId: m.userId,
              throwId: null,
              throwIndex: mi + 1,
              value: { kind: 'empty' as const },
            })),
          ])
        ),
        cumulativeByTeam: new Map(
          columns.map((c) => [
            c.teamId,
            {
              total: 0,
              isWinner: false,
              hasReset: false,
              becameDisqualified: false,
              throwCount: 0,
              hasThrowInRow: false,
            },
          ])
        ),
      },
    ],
    currentCell: null,
    rankings: columns.map((c, i) => ({
      teamId: c.teamId,
      teamName: c.teamName,
      totalScore: 0,
      rank: i + 1,
      isDisqualified: false,
    })),
    isFinished: false,
    isFirstThrow: true,
  }
}

describe('ScoreSheetView', () => {
  it('チーム名がヘッダーと順位フッターに表示される', () => {
    const data = buildEmptyData({
      teams: [
        { id: 'a', name: 'チームA', members: ['太郎'] },
        { id: 'b', name: 'チームB', members: ['花子'] },
      ],
    })
    render(<ScoreSheetView data={data} />)
    // ヘッダー + 順位フッターの両方にチーム名が出るので getAllByText
    expect(screen.getAllByText('チームA').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('チームB').length).toBeGreaterThanOrEqual(1)
  })

  it('メンバー名が全て表示される', () => {
    const data = buildEmptyData({
      teams: [
        { id: 'a', name: 'A', members: ['太郎', '次郎'] },
      ],
    })
    render(<ScoreSheetView data={data} />)
    expect(screen.getByText('太郎')).toBeInTheDocument()
    expect(screen.getByText('次郎')).toBeInTheDocument()
  })

  it('合計行が表示される', () => {
    const data = buildEmptyData({
      teams: [
        { id: 'a', name: 'A', members: ['x'] },
        { id: 'b', name: 'B', members: ['y'] },
      ],
    })
    render(<ScoreSheetView data={data} />)
    expect(screen.getByTestId('grand-total-a')).toBeInTheDocument()
    expect(screen.getByTestId('grand-total-b')).toBeInTheDocument()
  })

  it('合計セルにチーム別合計が表示される', () => {
    const data = buildEmptyData({
      teams: [{ id: 'a', name: 'A', members: ['x'] }],
    })
    render(<ScoreSheetView data={data} />)
    expect(screen.getByTestId('grand-total-a')).toHaveTextContent('0')
  })

})

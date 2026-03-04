import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveScoreBoard } from '../LiveScoreBoard'

const mockTeams = [
  { teamId: 'a', teamName: 'チームA', totalScore: 32, consecutiveMisses: 0, isDisqualified: false },
  { teamId: 'b', teamName: 'チームB', totalScore: 25, consecutiveMisses: 1, isDisqualified: false },
]

describe('LiveScoreBoard', () => {
  it('全チームのスコアが表示される', () => {
    render(<LiveScoreBoard teams={mockTeams} />)
    expect(screen.getByText('チームA')).toBeInTheDocument()
    expect(screen.getByText('チームB')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('スコアが高い順に並ぶ', () => {
    render(<LiveScoreBoard teams={mockTeams} />)
    const scores = screen.getAllByText(/\d+/).filter((el) =>
      ['32', '25'].includes(el.textContent ?? '')
    )
    // 32が25より先に表示されているか確認
    const pos32 = document.body.innerHTML.indexOf('32')
    const pos25 = document.body.innerHTML.indexOf('25')
    expect(pos32).toBeLessThan(pos25)
  })

  it('現在のチームにインジケーターが表示される', () => {
    render(<LiveScoreBoard teams={mockTeams} currentTeamId="a" />)
    expect(screen.getByLabelText('投擲中')).toBeInTheDocument()
  })

  it('失格チームに失格バッジが表示される', () => {
    const teams = [
      ...mockTeams,
      { teamId: 'c', teamName: 'チームC', totalScore: 0, consecutiveMisses: 3, isDisqualified: true },
    ]
    render(<LiveScoreBoard teams={teams} />)
    expect(screen.getByText('失格')).toBeInTheDocument()
  })

  it('勝利チームに優勝バッジが表示される', () => {
    const teams = [
      { teamId: 'a', teamName: 'チームA', totalScore: 50, consecutiveMisses: 0, isDisqualified: false, isWinner: true },
      mockTeams[1],
    ]
    render(<LiveScoreBoard teams={teams} />)
    expect(screen.getByText('優勝')).toBeInTheDocument()
  })

  it('連続ミスが表示される', () => {
    render(<LiveScoreBoard teams={mockTeams} />)
    expect(screen.getByText('連続ミス: 1 / 3')).toBeInTheDocument()
  })

  it('40点以上で「あと少し」バッジが表示される', () => {
    const teams = [
      { teamId: 'a', teamName: 'チームA', totalScore: 45, consecutiveMisses: 0, isDisqualified: false },
    ]
    render(<LiveScoreBoard teams={teams} />)
    expect(screen.getByText('あと少し')).toBeInTheDocument()
  })

  it('プログレスバーにaria属性が付く', () => {
    render(<LiveScoreBoard teams={mockTeams} />)
    const progressBars = screen.getAllByRole('progressbar')
    expect(progressBars.length).toBe(2)
    expect(progressBars[0]).toHaveAttribute('aria-valuenow')
  })
})

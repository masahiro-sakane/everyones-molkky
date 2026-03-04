import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchResult } from '../MatchResult'

const mockTeams = [
  { teamId: 'a', teamName: 'チームA', totalScore: 50, isDisqualified: false },
  { teamId: 'b', teamName: 'チームB', totalScore: 30, isDisqualified: false },
]

describe('MatchResult', () => {
  it('勝利チーム名が表示される', () => {
    render(<MatchResult winnerTeamId="a" teams={mockTeams} shareCode="abc123" />)
    expect(screen.getByText(/チームA の勝利/)).toBeInTheDocument()
  })

  it('勝利チームのスコアが表示される', () => {
    render(<MatchResult winnerTeamId="a" teams={mockTeams} shareCode="abc123" />)
    // 大きなスコア表示（text-4xl）と一覧スコアの両方あるのでallByTextで確認
    const scoreElements = screen.getAllByText('50点')
    expect(scoreElements.length).toBeGreaterThanOrEqual(1)
  })

  it('1位バッジが表示される', () => {
    render(<MatchResult winnerTeamId="a" teams={mockTeams} shareCode="abc123" />)
    expect(screen.getByText('1位')).toBeInTheDocument()
  })

  it('全チームの順位が表示される', () => {
    render(<MatchResult winnerTeamId="a" teams={mockTeams} shareCode="abc123" />)
    expect(screen.getByText('1位')).toBeInTheDocument()
    expect(screen.getByText('2位')).toBeInTheDocument()
  })

  it('失格チームに失格バッジが表示される', () => {
    const teams = [
      mockTeams[0],
      { ...mockTeams[1], isDisqualified: true },
    ]
    render(<MatchResult winnerTeamId="a" teams={teams} shareCode="abc123" />)
    expect(screen.getByText('失格')).toBeInTheDocument()
  })

  it('新しい試合ボタンが表示される', () => {
    render(<MatchResult winnerTeamId="a" teams={mockTeams} shareCode="abc123" />)
    expect(screen.getByRole('link', { name: /新しい試合を作成/ })).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreBoard } from '@/components/match/ScoreBoard'
import type { TeamScore } from '@/types/score'

const mockTeams: TeamScore[] = [
  {
    teamId: 'team-a',
    teamName: 'チームA',
    totalScore: 32,
    consecutiveMisses: 0,
    isDisqualified: false,
  },
  {
    teamId: 'team-b',
    teamName: 'チームB',
    totalScore: 25,
    consecutiveMisses: 1,
    isDisqualified: false,
  },
]

describe('ScoreBoard', () => {
  it('全チームのスコアが表示される', () => {
    render(<ScoreBoard teams={mockTeams} />)
    expect(screen.getByText('チームA')).toBeInTheDocument()
    expect(screen.getByText('チームB')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('連続ミスがあるとバッジが表示される', () => {
    render(<ScoreBoard teams={mockTeams} />)
    expect(screen.getByText('連続ミス 1/3')).toBeInTheDocument()
  })

  it('失格チームには失格バッジが表示される', () => {
    const teams: TeamScore[] = [
      {
        teamId: 'team-c',
        teamName: 'チームC',
        totalScore: 0,
        consecutiveMisses: 3,
        isDisqualified: true,
      },
    ]
    render(<ScoreBoard teams={teams} />)
    expect(screen.getByText('失格')).toBeInTheDocument()
  })

  it('40点以上のチームには残り点数が表示される', () => {
    const teams: TeamScore[] = [
      {
        teamId: 'team-d',
        teamName: 'チームD',
        totalScore: 45,
        consecutiveMisses: 0,
        isDisqualified: false,
      },
    ]
    render(<ScoreBoard teams={teams} />)
    expect(screen.getByText('あと5点!')).toBeInTheDocument()
  })

  it('プログレスバーがaria属性を持つ', () => {
    render(<ScoreBoard teams={mockTeams} />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(2)
    expect(bars[0]).toHaveAttribute('aria-valuenow', '32')
    expect(bars[0]).toHaveAttribute('aria-valuemax', '50')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchBoard } from '../MatchBoard'
import type { MatchData } from '@/hooks/useMatch'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/hooks/useRealtimeScore', () => ({
  useRealtimeScore: vi.fn(() => ({ status: 'connected' })),
}))

const baseMatch: MatchData = {
  id: 'match-1',
  shareCode: 'SHARE01',
  status: 'IN_PROGRESS',
  limitType: 'NONE',
  turnLimit: null,
  timeLimitMinutes: null,
  startedAt: null,
  matchTeams: [
    {
      teamId: 'team-1',
      order: 1,
      memberOrder: [],
      team: {
        id: 'team-1',
        name: 'チームA',
        members: [{ userId: 'user-1', role: 'MEMBER', user: { id: 'user-1', name: '田中' } }],
      },
    },
    {
      teamId: 'team-2',
      order: 2,
      memberOrder: [],
      team: {
        id: 'team-2',
        name: 'チームB',
        members: [{ userId: 'user-2', role: 'MEMBER', user: { id: 'user-2', name: '鈴木' } }],
      },
    },
  ],
  sets: [
    {
      id: 'set-1',
      setNumber: 1,
      status: 'IN_PROGRESS',
      winnerId: null,
      turns: [
        {
          id: 'turn-1',
          turnNumber: 1,
          throws: [],
        },
      ],
    },
  ],
}

describe('MatchBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('スコアボードセクションを表示する', () => {
    render(<MatchBoard match={baseMatch} />)
    expect(screen.getByRole('region', { name: 'スコアボード' })).toBeInTheDocument()
  })

  it('投擲履歴セクションを表示する', () => {
    render(<MatchBoard match={baseMatch} />)
    expect(screen.getByText('投擲履歴（0回）')).toBeInTheDocument()
  })

  it('共有URLを表示する', () => {
    render(<MatchBoard match={baseMatch} />)
    const input = screen.getByRole('textbox', { name: '試合共有URL' })
    expect(input.getAttribute('value')).toContain('SHARE01')
  })

  it('観戦モードでは投擲入力が表示されない', () => {
    render(<MatchBoard match={baseMatch} watchMode />)
    expect(screen.queryByText('投擲を記録')).not.toBeInTheDocument()
    expect(screen.getByText(/観戦モード/)).toBeInTheDocument()
  })

  it('通常モードでは投擲入力セクションが表示される', () => {
    render(<MatchBoard match={baseMatch} />)
    expect(screen.getByText('投擲を記録')).toBeInTheDocument()
  })

  it('limitType=NONEのとき制限ルール表示がない', () => {
    render(<MatchBoard match={baseMatch} />)
    expect(screen.queryByLabelText('ターン制限状況')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('時間制限状況')).not.toBeInTheDocument()
  })

  it('limitType=TURNSのときターン制限状況が表示される', () => {
    const match: MatchData = {
      ...baseMatch,
      limitType: 'TURNS',
      turnLimit: 12,
    }
    render(<MatchBoard match={match} />)
    expect(screen.getByLabelText('ターン制限状況')).toBeInTheDocument()
    expect(screen.getAllByText(/ラウンド/).length).toBeGreaterThan(0)
  })

  it('limitType=TIMEのとき時間制限状況が表示される', () => {
    const match: MatchData = {
      ...baseMatch,
      limitType: 'TIME',
      timeLimitMinutes: 20,
      startedAt: new Date().toISOString(),
    }
    render(<MatchBoard match={match} />)
    expect(screen.getByLabelText('時間制限状況')).toBeInTheDocument()
  })

  it('試合終了時はMatchResultを表示する', () => {
    const finishedMatch: MatchData = {
      ...baseMatch,
      status: 'FINISHED',
      sets: [
        {
          id: 'set-1',
          setNumber: 1,
          status: 'FINISHED',
          winnerId: 'team-1',
          turns: [],
        },
      ],
      teamSetScores: [
        { teamId: 'team-1', totalScore: 50, consecutiveMisses: 0, isDisqualified: false },
        { teamId: 'team-2', totalScore: 30, consecutiveMisses: 0, isDisqualified: false },
      ],
    }
    render(<MatchBoard match={finishedMatch} />)
    // MatchResult は チームA の勝利を表示する
    expect(screen.getAllByText(/チームA/).length).toBeGreaterThan(0)
  })
})

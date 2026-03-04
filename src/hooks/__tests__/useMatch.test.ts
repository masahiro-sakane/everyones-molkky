import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMatch, type MatchData } from '../useMatch'

const baseMatch: MatchData = {
  id: 'match-1',
  shareCode: 'abc123',
  status: 'IN_PROGRESS',
  matchTeams: [
    {
      teamId: 'team-a',
      order: 1,
      team: {
        id: 'team-a',
        name: 'チームA',
        members: [
          { userId: 'user-1', role: 'captain', user: { id: 'user-1', name: '田中 太郎' } },
        ],
      },
    },
    {
      teamId: 'team-b',
      order: 2,
      team: {
        id: 'team-b',
        name: 'チームB',
        members: [
          { userId: 'user-2', role: 'member', user: { id: 'user-2', name: '佐藤 花子' } },
        ],
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
          throws: [
            {
              id: 'throw-1',
              teamId: 'team-a',
              userId: 'user-1',
              throwOrder: 1,
              skittlesKnocked: [5],
              score: 5,
              isFault: false,
              faultType: null,
              createdAt: new Date().toISOString(),
              user: { id: 'user-1', name: '田中 太郎' },
            },
          ],
        },
      ],
    },
  ],
  teamSetScores: [
    { teamId: 'team-a', totalScore: 5, consecutiveMisses: 0, isDisqualified: false },
    { teamId: 'team-b', totalScore: 0, consecutiveMisses: 0, isDisqualified: false },
  ],
}

describe('useMatch', () => {
  it('チームスコアを正しく返す', () => {
    const { result } = renderHook(() => useMatch(baseMatch))
    expect(result.current.teamScores).toHaveLength(2)
    const teamA = result.current.teamScores.find((t) => t.teamId === 'team-a')
    expect(teamA?.totalScore).toBe(5)
    expect(teamA?.teamName).toBe('チームA')
  })

  it('現在の投擲者を返す（ターン1 → チームA）', () => {
    const { result } = renderHook(() => useMatch(baseMatch))
    expect(result.current.currentThrower?.teamId).toBe('team-a')
    expect(result.current.currentThrower?.userName).toBe('田中 太郎')
  })

  it('投擲履歴を返す', () => {
    const { result } = renderHook(() => useMatch(baseMatch))
    expect(result.current.throwHistory).toHaveLength(1)
    expect(result.current.throwHistory[0].score).toBe(5)
    expect(result.current.throwHistory[0].teamName).toBe('チームA')
  })

  it('試合終了時はisFinishedがtrueになる', () => {
    const finished = { ...baseMatch, status: 'FINISHED' }
    const { result } = renderHook(() => useMatch(finished))
    expect(result.current.isFinished).toBe(true)
  })

  it('試合終了時はcurrentThrowerがnull', () => {
    const finished = { ...baseMatch, status: 'FINISHED' }
    const { result } = renderHook(() => useMatch(finished))
    expect(result.current.currentThrower).toBeNull()
  })

  it('失格チームを検出する', () => {
    const match = {
      ...baseMatch,
      teamSetScores: [
        { teamId: 'team-a', totalScore: 5, consecutiveMisses: 0, isDisqualified: false },
        { teamId: 'team-b', totalScore: 0, consecutiveMisses: 3, isDisqualified: true },
      ],
    }
    const { result } = renderHook(() => useMatch(match))
    expect(result.current.newlyDisqualifiedTeams).toHaveLength(1)
    expect(result.current.newlyDisqualifiedTeams[0].teamId).toBe('team-b')
  })

  it('勝者IDを返す', () => {
    const match = {
      ...baseMatch,
      status: 'FINISHED',
      sets: [
        {
          ...baseMatch.sets[0],
          status: 'FINISHED',
          winnerId: 'team-a',
        },
      ],
    }
    const { result } = renderHook(() => useMatch(match))
    expect(result.current.winnerTeamId).toBe('team-a')
  })

  it('ターン2ではチームBが投擲者', () => {
    const match = {
      ...baseMatch,
      sets: [
        {
          ...baseMatch.sets[0],
          turns: [
            ...baseMatch.sets[0].turns,
            {
              id: 'turn-2',
              turnNumber: 2,
              throws: [],
            },
          ],
        },
      ],
    }
    const { result } = renderHook(() => useMatch(match))
    expect(result.current.currentThrower?.teamId).toBe('team-b')
    expect(result.current.currentThrower?.teamOrder).toBe(2)
  })
})

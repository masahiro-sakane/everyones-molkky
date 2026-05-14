import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScoreSheet } from '../useScoreSheet'
import type { MatchData } from '../useMatch'

type ThrowSeed = {
  id: string
  teamId: string
  userId: string
  throwOrder: number
  skittlesKnocked: number[]
  score: number
  isFault?: boolean
  faultType?: string | null
  userName?: string
}

/** テストヘルパー: チーム×メンバー構成と投擲履歴から MatchData を組み立てる */
function buildMatch(opts: {
  teams: Array<{
    id: string
    name: string
    members: Array<{ id: string; name: string }>
  }>
  throws: ThrowSeed[]
  status?: 'IN_PROGRESS' | 'FINISHED' | 'WAITING'
}): MatchData {
  const { teams, throws, status = 'IN_PROGRESS' } = opts

  // throws を turnNumber に振り分ける
  // 各チームの投擲ごとに turnNumber を割り振る簡易ルール:
  // 各throwにturnNumberを後付けする：チームindex + (teamCount * teamThrowIndex) +1
  const teamCount = teams.length
  const teamThrowCounts = new Map<string, number>()
  const enrichedThrows = throws.map((t) => {
    const teamIdx = teams.findIndex((tm) => tm.id === t.teamId)
    const throwIdx = teamThrowCounts.get(t.teamId) ?? 0
    teamThrowCounts.set(t.teamId, throwIdx + 1)
    const turnNumber = teamIdx + 1 + teamCount * throwIdx
    return { ...t, turnNumber }
  })

  // turnNumber でグループ化
  const turnMap = new Map<number, typeof enrichedThrows>()
  for (const t of enrichedThrows) {
    if (!turnMap.has(t.turnNumber)) turnMap.set(t.turnNumber, [])
    turnMap.get(t.turnNumber)!.push(t)
  }

  const turns = Array.from(turnMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([turnNumber, ts]) => ({
      id: `turn-${turnNumber}`,
      turnNumber,
      throws: ts.map((t) => ({
        id: t.id,
        teamId: t.teamId,
        userId: t.userId,
        throwOrder: t.throwOrder,
        skittlesKnocked: t.skittlesKnocked,
        score: t.score,
        isFault: t.isFault ?? false,
        faultType: (t.faultType ?? null) as string | null,
        createdAt: '2026-01-01T00:00:00Z',
        user: { id: t.userId, name: t.userName ?? t.userId },
      })),
    }))

  return {
    id: 'match-test',
    shareCode: 'TEST00',
    status,
    matchType: 'TEAM',
    limitType: 'NONE',
    turnLimit: null,
    timeLimitMinutes: null,
    startedAt: null,
    matchTeams: teams.map((t, i) => ({
      teamId: t.id,
      order: i + 1,
      memberOrder: t.members.map((m) => m.id),
      team: {
        id: t.id,
        name: t.name,
        isSolo: false,
        members: t.members.map((m) => ({
          userId: m.id,
          role: 'member',
          user: { id: m.id, name: m.name },
        })),
      },
    })),
    sets: [
      {
        id: 'set-1',
        setNumber: 1,
        status: status === 'FINISHED' ? 'FINISHED' : 'IN_PROGRESS',
        winnerId: null,
        turns,
      },
    ],
  }
}

describe('useScoreSheet', () => {
  describe('列定義', () => {
    it('チーム数と order に応じた列を返す', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'チームA', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'チームB', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.columns).toHaveLength(2)
      expect(result.current.columns[0].teamName).toBe('チームA')
      expect(result.current.columns[1].teamName).toBe('チームB')
    })

    it('メンバーを memberOrder の順序で並べる', () => {
      const match = buildMatch({
        teams: [
          {
            id: 'a',
            name: 'A',
            members: [
              { id: 'u1', name: '一郎' },
              { id: 'u2', name: '次郎' },
              { id: 'u3', name: '三郎' },
            ],
          },
        ],
        throws: [],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      const names = result.current.columns[0].members.map((m) => m.userName)
      expect(names).toEqual(['一郎', '次郎', '三郎'])
    })

    it('メンバー数が違うチームは空メンバーでパディングされる', () => {
      const match = buildMatch({
        teams: [
          {
            id: 'a',
            name: 'A',
            members: [
              { id: 'u1', name: '太郎' },
              { id: 'u2', name: '花子' },
            ],
          },
          {
            id: 'b',
            name: 'B',
            members: [{ id: 'u3', name: '次郎' }],
          },
        ],
        throws: [],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.columns[1].members).toHaveLength(2)
      expect(result.current.columns[1].members[1].userName).toBe('')
    })
  })

  describe('セル値の導出', () => {
    it('通常の投擲は kind=score でセルが埋まる', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [7], score: 7 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      const row1 = result.current.rows[0]
      const aCells = row1.cellsByTeam.get('a')!
      expect(aCells[0].value).toEqual({ kind: 'score', n: 7 })
    })

    it('0点はミスセルになる', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      const row1 = result.current.rows[0]
      const aCells = row1.cellsByTeam.get('a')!
      expect(aCells[0].value).toEqual({ kind: 'miss' })
    })

    it('累計ちょうど50で goal セルになる', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't2', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't3', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't4', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't5', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [2], score: 2 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      const aCells = result.current.rows[4].cellsByTeam.get('a')!
      expect(aCells[0].value).toEqual({ kind: 'goal' })
      expect(result.current.columns[0].isWinner).toBe(true)
    })

    it('累計が50超のとき reset セルになり累計が25にリセット', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't2', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't3', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't4', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 12 },
          { id: 't5', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      const r5 = result.current.rows[4]
      const aCells = r5.cellsByTeam.get('a')!
      expect(aCells[0].value).toEqual({ kind: 'reset', score: 5 })
      expect(r5.cumulativeByTeam.get('a')?.total).toBe(25)
    })
  })

  describe('累計計算', () => {
    it('各行の累計が正しく加算される', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
          { id: 't2', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [8], score: 8 },
          { id: 't3', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [3], score: 3 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.rows[0].cumulativeByTeam.get('a')?.total).toBe(5)
      expect(result.current.rows[1].cumulativeByTeam.get('a')?.total).toBe(13)
      expect(result.current.rows[2].cumulativeByTeam.get('a')?.total).toBe(16)
    })

    it('ミスは累計を変えない', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
          { id: 't2', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.rows[0].cumulativeByTeam.get('a')?.total).toBe(5)
      expect(result.current.rows[1].cumulativeByTeam.get('a')?.total).toBe(5)
    })
  })

  describe('失格', () => {
    it('3回連続ミスで失格になる', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't2', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't3', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.columns[0].isDisqualified).toBe(true)
    })

    it('得点でミスカウントがリセットされる', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't2', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't3', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
          { id: 't4', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.columns[0].isDisqualified).toBe(false)
    })
  })

  describe('現在の投擲セル', () => {
    it('IN_PROGRESS で投擲ゼロのとき最初のチーム1行目を返す', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.currentCell).toEqual({
        rowIndex: 1,
        teamId: 'a',
        userId: 'u1',
      })
    })

    it('チームAが1投したらチームBが現在投擲セル', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.currentCell?.teamId).toBe('b')
    })

    it('失格チームは現在投擲セルから除外される', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          // Aが3回ミスで失格
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't2', teamId: 'b', userId: 'u2', throwOrder: 1, skittlesKnocked: [5], score: 5 },
          { id: 't3', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't4', teamId: 'b', userId: 'u2', throwOrder: 1, skittlesKnocked: [3], score: 3 },
          { id: 't5', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [], score: 0 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.currentCell?.teamId).toBe('b')
    })
  })

  describe('順位', () => {
    it('得点降順で順位が付く', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
          { id: 'c', name: 'C', members: [{ id: 'u3', name: '次郎' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
          { id: 't2', teamId: 'b', userId: 'u2', throwOrder: 1, skittlesKnocked: [10], score: 10 },
          { id: 't3', teamId: 'c', userId: 'u3', throwOrder: 1, skittlesKnocked: [3], score: 3 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      const ranks = result.current.rankings
      expect(ranks[0].teamName).toBe('B')
      expect(ranks[1].teamName).toBe('A')
      expect(ranks[2].teamName).toBe('C')
    })

    it('失格チームは最下位になる', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
          { id: 't2', teamId: 'b', userId: 'u2', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't3', teamId: 'b', userId: 'u2', throwOrder: 1, skittlesKnocked: [], score: 0 },
          { id: 't4', teamId: 'b', userId: 'u2', throwOrder: 1, skittlesKnocked: [], score: 0 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.rankings[0].teamName).toBe('A')
      expect(result.current.rankings[1].teamName).toBe('B')
      expect(result.current.rankings[1].isDisqualified).toBe(true)
    })
  })

  describe('isFirstThrow', () => {
    it('投擲ゼロのとき true', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.isFirstThrow).toBe(true)
    })

    it('1投以上あれば false', () => {
      const match = buildMatch({
        teams: [
          { id: 'a', name: 'A', members: [{ id: 'u1', name: '太郎' }] },
          { id: 'b', name: 'B', members: [{ id: 'u2', name: '花子' }] },
        ],
        throws: [
          { id: 't1', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [5], score: 5 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      expect(result.current.isFirstThrow).toBe(false)
    })
  })


  describe('3チーム×3名ローテーション', () => {
    it('各投擲が正しいメンバー列に入る', () => {
      // 実際のDBと同じ状況: memberOrder が定義順と逆
      // チームA: memberOrder=[u3,u2,u1] → 列1=u3(佐藤), 列2=u2(鈴木), 列3=u1(田中)
      const match = buildMatch({
        teams: [
          {
            id: 'a',
            name: 'チームA',
            members: [
              { id: 'u1', name: '田中' },
              { id: 'u2', name: '鈴木' },
              { id: 'u3', name: '佐藤' },
            ],
          },
          {
            id: 'b',
            name: 'チームB',
            members: [{ id: 'u4', name: '伊藤' }],
          },
        ],
        throws: [
          // ラウンド1: チームA=佐藤(u3), チームB=伊藤
          { id: 't1', teamId: 'a', userId: 'u3', throwOrder: 1, skittlesKnocked: [12], score: 12 },
          { id: 't2', teamId: 'b', userId: 'u4', throwOrder: 1, skittlesKnocked: [9], score: 9 },
          // ラウンド2: チームA=鈴木(u2)
          { id: 't3', teamId: 'a', userId: 'u2', throwOrder: 1, skittlesKnocked: [10], score: 10 },
          { id: 't4', teamId: 'b', userId: 'u4', throwOrder: 1, skittlesKnocked: [5], score: 5 },
          // ラウンド3: チームA=田中(u1)
          { id: 't5', teamId: 'a', userId: 'u1', throwOrder: 1, skittlesKnocked: [8], score: 8 },
          { id: 't6', teamId: 'b', userId: 'u4', throwOrder: 1, skittlesKnocked: [3], score: 3 },
        ],
      })
      const { result } = renderHook(() => useScoreSheet(match))
      const rows = result.current.rows

      // buildMatch は memberOrder=定義順[u1,u2,u3] なので:
      // 列0=u1(田中), 列1=u2(鈴木), 列2=u3(佐藤)
      // 行0: 佐藤(u3)が投げた → 列2にスコア
      const r0aCells = rows[0].cellsByTeam.get('a')!
      expect(r0aCells[0].value).toEqual({ kind: 'empty' })
      expect(r0aCells[1].value).toEqual({ kind: 'empty' })
      expect(r0aCells[2].value).toEqual({ kind: 'score', n: 12 }) // 佐藤の列

      // 行1: 鈴木(u2)が投げた → 列1にスコア
      const r1aCells = rows[1].cellsByTeam.get('a')!
      expect(r1aCells[0].value).toEqual({ kind: 'empty' })
      expect(r1aCells[1].value).toEqual({ kind: 'score', n: 10 }) // 鈴木の列
      expect(r1aCells[2].value).toEqual({ kind: 'empty' })

      // 行2: 田中(u1)が投げた → 列0にスコア
      const r2aCells = rows[2].cellsByTeam.get('a')!
      expect(r2aCells[0].value).toEqual({ kind: 'score', n: 8 }) // 田中の列
      expect(r2aCells[1].value).toEqual({ kind: 'empty' })
      expect(r2aCells[2].value).toEqual({ kind: 'empty' })
    })

    it('memberOrder が逆順でも正しいメンバー列に入る', () => {
      // buildMatch は memberOrder=members定義順になるので、逆順を手動設定するため直接構築
      // useScoreSheet に直接MatchDataを渡す
      const matchData: Parameters<typeof useScoreSheet>[0] = {
        id: 'test',
        shareCode: 'TEST',
        status: 'IN_PROGRESS',
        matchType: 'TEAM',
        limitType: 'NONE',
        turnLimit: null,
        timeLimitMinutes: null,
        startedAt: null,
        matchTeams: [
          {
            teamId: 'a',
            order: 1,
            memberOrder: ['u3', 'u2', 'u1'], // 逆順: 佐藤,鈴木,田中
            team: {
              id: 'a',
              name: 'チームA',
              isSolo: false,
              members: [
                { userId: 'u1', role: 'member', user: { id: 'u1', name: '田中' } },
                { userId: 'u2', role: 'member', user: { id: 'u2', name: '鈴木' } },
                { userId: 'u3', role: 'member', user: { id: 'u3', name: '佐藤' } },
              ],
            },
          },
        ],
        sets: [
          {
            id: 's1',
            setNumber: 1,
            status: 'IN_PROGRESS',
            winnerId: null,
            turns: [
              {
                id: 'tn1',
                turnNumber: 1,
                throws: [
                  {
                    id: 'th1', teamId: 'a', userId: 'u3', throwOrder: 1,
                    skittlesKnocked: [12], score: 12, isFault: false, faultType: null,
                    createdAt: '2026-01-01', user: { id: 'u3', name: '佐藤' },
                  },
                ],
              },
              {
                id: 'tn2',
                turnNumber: 2,
                throws: [
                  {
                    id: 'th2', teamId: 'a', userId: 'u2', throwOrder: 1,
                    skittlesKnocked: [10], score: 10, isFault: false, faultType: null,
                    createdAt: '2026-01-01', user: { id: 'u2', name: '鈴木' },
                  },
                ],
              },
              {
                id: 'tn3',
                turnNumber: 3,
                throws: [
                  {
                    id: 'th3', teamId: 'a', userId: 'u1', throwOrder: 1,
                    skittlesKnocked: [8], score: 8, isFault: false, faultType: null,
                    createdAt: '2026-01-01', user: { id: 'u1', name: '田中' },
                  },
                ],
              },
            ],
          },
        ],
      }
      const { result } = renderHook(() => useScoreSheet(matchData))
      const rows = result.current.rows

      // memberOrder=[u3,u2,u1] → 列0=佐藤(u3), 列1=鈴木(u2), 列2=田中(u1)
      // 行0: 佐藤(u3)が投げた → 列0にスコア
      const r0 = rows[0].cellsByTeam.get('a')!
      expect(r0[0].value).toEqual({ kind: 'score', n: 12 }) // 佐藤
      expect(r0[1].value).toEqual({ kind: 'empty' })
      expect(r0[2].value).toEqual({ kind: 'empty' })

      // 行1: 鈴木(u2)が投げた → 列1にスコア
      const r1 = rows[1].cellsByTeam.get('a')!
      expect(r1[0].value).toEqual({ kind: 'empty' })
      expect(r1[1].value).toEqual({ kind: 'score', n: 10 }) // 鈴木
      expect(r1[2].value).toEqual({ kind: 'empty' })

      // 行2: 田中(u1)が投げた → 列2にスコア
      const r2 = rows[2].cellsByTeam.get('a')!
      expect(r2[0].value).toEqual({ kind: 'empty' })
      expect(r2[1].value).toEqual({ kind: 'empty' })
      expect(r2[2].value).toEqual({ kind: 'score', n: 8 }) // 田中
    })
  })
})

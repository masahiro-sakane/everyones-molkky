import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { createTestDb, createTestUser, createTestTeam } from '@/test/factories'
import {
  getTeamStats,
  listTeamStats,
  getUserStats,
  listUserStats,
  getMatchScoreHistory,
} from '@/services/statsService'

const hasDb = !!process.env.DATABASE_URL

describe.skipIf(!hasDb)('statsService 統合テスト', () => {
  const { db, pool } = createTestDb()
  const cleanupIds = {
    matches: [] as string[],
    teams: [] as string[],
    users: [] as string[],
  }

  afterEach(async () => {
    for (const id of cleanupIds.matches) {
      await db.match.deleteMany({ where: { id } }).catch(() => {})
    }
    for (const id of cleanupIds.teams) {
      await db.team.deleteMany({ where: { id } }).catch(() => {})
    }
    for (const id of cleanupIds.users) {
      await db.user.deleteMany({ where: { id } }).catch(() => {})
    }
    cleanupIds.matches.length = 0
    cleanupIds.teams.length = 0
    cleanupIds.users.length = 0
  })

  afterAll(async () => {
    await db.$disconnect()
    await pool.end()
  })

  async function createFinishedMatchWithThrows() {
    const teamA = await createTestTeam(db, { name: `統計チームA_${Date.now()}` })
    const teamB = await createTestTeam(db, { name: `統計チームB_${Date.now()}` })
    const user = await createTestUser(db, { name: `統計ユーザー_${Date.now()}` })
    cleanupIds.teams.push(teamA.id, teamB.id)
    cleanupIds.users.push(user.id)

    // チームにメンバー追加
    await db.teamMember.create({ data: { teamId: teamA.id, userId: user.id } })

    const match = await db.match.create({ data: { status: 'FINISHED' } })
    cleanupIds.matches.push(match.id)

    await db.matchTeam.createMany({
      data: [
        { matchId: match.id, teamId: teamA.id, order: 1 },
        { matchId: match.id, teamId: teamB.id, order: 2 },
      ],
    })

    const set = await db.set.create({
      data: { matchId: match.id, setNumber: 1, winnerId: teamA.id },
    })

    await db.teamSetScore.createMany({
      data: [
        { setId: set.id, teamId: teamA.id, totalScore: 50, consecutiveMisses: 0, isDisqualified: false },
        { setId: set.id, teamId: teamB.id, totalScore: 30, consecutiveMisses: 0, isDisqualified: false },
      ],
    })

    const turn = await db.turn.create({ data: { setId: set.id, turnNumber: 1 } })

    // teamAが投擲（スキットル3本 → 3点）
    await db.throw.create({
      data: {
        turnId: turn.id,
        teamId: teamA.id,
        userId: user.id,
        score: 3,
        skittlesKnocked: [1, 2, 3],
        isFault: false,
        throwOrder: 1,
      },
    })
    // teamAがミス（0点）
    await db.throw.create({
      data: {
        turnId: turn.id,
        teamId: teamA.id,
        userId: user.id,
        score: 0,
        skittlesKnocked: [],
        isFault: false,
        throwOrder: 2,
      },
    })

    return { teamA, teamB, user, match, set }
  }

  // ---- getTeamStats ----

  it('存在しないチームIDはnullを返す', async () => {
    const result = await getTeamStats('nonexistent-id')
    expect(result).toBeNull()
  })

  it('試合なしチームの統計を返す', async () => {
    const team = await createTestTeam(db, { name: `空チーム_${Date.now()}` })
    cleanupIds.teams.push(team.id)

    const stats = await getTeamStats(team.id)
    expect(stats).not.toBeNull()
    expect(stats!.matchCount).toBe(0)
    expect(stats!.winCount).toBe(0)
    expect(stats!.winRate).toBe(0)
  })

  it('完了試合のある勝利チームの統計を正しく計算する', async () => {
    const { teamA } = await createFinishedMatchWithThrows()

    const stats = await getTeamStats(teamA.id)
    expect(stats).not.toBeNull()
    expect(stats!.matchCount).toBe(1)
    expect(stats!.winCount).toBe(1)
    expect(stats!.winRate).toBe(100)
    expect(stats!.avgFinalScore).toBe(50)
    expect(stats!.missRate).toBeGreaterThanOrEqual(0)
  })

  it('敗北チームの勝率は0%', async () => {
    const { teamB } = await createFinishedMatchWithThrows()

    const stats = await getTeamStats(teamB.id)
    expect(stats).not.toBeNull()
    expect(stats!.matchCount).toBe(1)
    expect(stats!.winCount).toBe(0)
    expect(stats!.winRate).toBe(0)
  })

  // ---- listTeamStats ----

  it('チーム統計一覧は勝率降順で返す', async () => {
    const { teamA, teamB } = await createFinishedMatchWithThrows()

    const stats = await listTeamStats()
    const teamAStats = stats.find((s) => s.teamId === teamA.id)
    const teamBStats = stats.find((s) => s.teamId === teamB.id)

    expect(teamAStats).toBeDefined()
    expect(teamBStats).toBeDefined()

    // teamAの方が勝率が高いので先に来る
    const aIdx = stats.findIndex((s) => s.teamId === teamA.id)
    const bIdx = stats.findIndex((s) => s.teamId === teamB.id)
    expect(aIdx).toBeLessThan(bIdx)
  })

  // ---- getUserStats ----

  it('存在しないユーザーIDはnullを返す', async () => {
    const result = await getUserStats('nonexistent-id')
    expect(result).toBeNull()
  })

  it('投擲なしユーザーの統計を返す', async () => {
    const user = await createTestUser(db, { name: `空ユーザー_${Date.now()}` })
    cleanupIds.users.push(user.id)

    const stats = await getUserStats(user.id)
    expect(stats).not.toBeNull()
    expect(stats!.throwCount).toBe(0)
    expect(stats!.avgScore).toBe(0)
    expect(stats!.missRate).toBe(0)
  })

  it('投擲ありユーザーの統計を正しく計算する', async () => {
    const { user } = await createFinishedMatchWithThrows()

    const stats = await getUserStats(user.id)
    expect(stats).not.toBeNull()
    expect(stats!.throwCount).toBe(2)  // 3点 + 0点（ミス）
    expect(stats!.avgScore).toBe(1.5)  // (3+0)/2
    expect(stats!.missRate).toBe(50)   // 1/2 = 50%
    expect(stats!.highestSingleThrow).toBe(3)
  })

  // ---- listUserStats ----

  it('ユーザー統計一覧は平均得点降順で返す', async () => {
    const user1 = await createTestUser(db, { name: `高得点ユーザー_${Date.now()}` })
    const user2 = await createTestUser(db, { name: `低得点ユーザー_${Date.now()}` })
    cleanupIds.users.push(user1.id, user2.id)

    // ダミーの投擲データを作成するため試合を作成
    const team = await createTestTeam(db, { name: `一覧テストチーム_${Date.now()}` })
    cleanupIds.teams.push(team.id)

    const match = await db.match.create({ data: { status: 'FINISHED' } })
    cleanupIds.matches.push(match.id)
    await db.matchTeam.create({ data: { matchId: match.id, teamId: team.id, order: 1 } })
    const set = await db.set.create({ data: { matchId: match.id, setNumber: 1 } })
    await db.teamSetScore.create({ data: { setId: set.id, teamId: team.id, totalScore: 0, consecutiveMisses: 0, isDisqualified: false } })
    const turn = await db.turn.create({ data: { setId: set.id, turnNumber: 1 } })

    await db.throw.create({
      data: { turnId: turn.id, teamId: team.id, userId: user1.id, score: 5, skittlesKnocked: [1, 2, 3, 4, 5], isFault: false, throwOrder: 1 },
    })
    await db.throw.create({
      data: { turnId: turn.id, teamId: team.id, userId: user2.id, score: 1, skittlesKnocked: [1], isFault: false, throwOrder: 2 },
    })

    const stats = await listUserStats()
    const u1 = stats.find((s) => s.userId === user1.id)
    const u2 = stats.find((s) => s.userId === user2.id)
    expect(u1).toBeDefined()
    expect(u2).toBeDefined()

    const u1Idx = stats.findIndex((s) => s.userId === user1.id)
    const u2Idx = stats.findIndex((s) => s.userId === user2.id)
    expect(u1Idx).toBeLessThan(u2Idx)
  })

  // ---- getMatchScoreHistory ----

  it('存在しない試合はnullを返す', async () => {
    const result = await getMatchScoreHistory('NONEXISTENT')
    expect(result).toBeNull()
  })

  it('投擲ありの試合のスコア推移を返す', async () => {
    const { match } = await createFinishedMatchWithThrows()

    const result = await getMatchScoreHistory(match.shareCode)
    expect(result).not.toBeNull()
    expect(result!.teams.length).toBe(2)
    expect(result!.snapshots.length).toBe(2)  // 投擲2回分

    // スコアが累積されている
    const firstSnap = result!.snapshots[0]
    expect(firstSnap.score).toBe(3)
    const secondSnap = result!.snapshots[1]
    expect(secondSnap.score).toBe(3)  // ミスなので累積変わらず
  })
})

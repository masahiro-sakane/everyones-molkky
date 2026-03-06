import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { createTestDb } from '@/test/factories'
import { recordThrow } from '@/services/scoreService'
import { createMatch } from '@/services/matchService'
import { createTeam } from '@/services/teamService'
import { createUser } from '@/services/userService'

const hasDb = !!process.env.DATABASE_URL

describe.skipIf(!hasDb)('scoreService 統合テスト', () => {
  const { db, pool } = createTestDb()
  const teamIds: string[] = []
  const matchIds: string[] = []
  const userIds: string[] = []

  afterEach(async () => {
    for (const id of matchIds) {
      await db.match.deleteMany({ where: { id } }).catch(() => {})
    }
    for (const id of teamIds) {
      await db.team.deleteMany({ where: { id } }).catch(() => {})
    }
    for (const id of userIds) {
      await db.user.deleteMany({ where: { id } }).catch(() => {})
    }
    matchIds.length = 0
    teamIds.length = 0
    userIds.length = 0
  })

  afterAll(async () => {
    await db.$disconnect()
    await pool.end()
  })

  async function setupMatchWithTeams() {
    const teamA = await createTeam({ name: `スコアチームA_${Date.now()}` })
    const teamB = await createTeam({ name: `スコアチームB_${Date.now()}` })
    const user = await createUser({ name: `スコアユーザー_${Date.now()}` })
    teamIds.push(teamA.id, teamB.id)
    userIds.push(user.id)

    const match = await createMatch({ matchType: 'TEAM', teamIds: [teamA.id, teamB.id] })
    matchIds.push(match.id)

    return { match, teamA, teamB, user }
  }

  it('投擲を記録できる', async () => {
    const { match, teamA, user } = await setupMatchWithTeams()

    const result = await recordThrow(match.shareCode, {
      userId: user.id,
      teamId: teamA.id,
      skittlesKnocked: [7],
      faultType: null,
    })

    expect(result.throw.score).toBe(7)
    expect(result.result.totalScore).toBe(7)
    expect(result.result.isWinner).toBe(false)
  })

  it('複数本倒した場合は本数が得点になる', async () => {
    const { match, teamA, user } = await setupMatchWithTeams()

    const result = await recordThrow(match.shareCode, {
      userId: user.id,
      teamId: teamA.id,
      skittlesKnocked: [1, 2, 3],
      faultType: null,
    })

    expect(result.throw.score).toBe(3)
    expect(result.result.totalScore).toBe(3)
  })

  it('50点ちょうどで勝利する', async () => {
    const { match, teamA, user } = await setupMatchWithTeams()

    // 43点まで加算
    await db.teamSetScore.updateMany({
      where: { teamId: teamA.id },
      data: { totalScore: 43 },
    })

    const result = await recordThrow(match.shareCode, {
      userId: user.id,
      teamId: teamA.id,
      skittlesKnocked: [7],
      faultType: null,
    })

    expect(result.result.totalScore).toBe(50)
    expect(result.result.isWinner).toBe(true)

    // 試合がFINISHEDになっていることを確認
    const updatedMatch = await db.match.findUnique({ where: { shareCode: match.shareCode } })
    expect(updatedMatch?.status).toBe('FINISHED')
  })

  it('50点超過で25点にリセットされる', async () => {
    const { match, teamA, user } = await setupMatchWithTeams()

    await db.teamSetScore.updateMany({
      where: { teamId: teamA.id },
      data: { totalScore: 48 },
    })

    const result = await recordThrow(match.shareCode, {
      userId: user.id,
      teamId: teamA.id,
      skittlesKnocked: [5],
      faultType: null,
    })

    expect(result.result.totalScore).toBe(25)
    expect(result.result.isWinner).toBe(false)
  })

  it('ミスで連続ミス数が増える', async () => {
    const { match, teamA, user } = await setupMatchWithTeams()

    const result = await recordThrow(match.shareCode, {
      userId: user.id,
      teamId: teamA.id,
      skittlesKnocked: [],
      faultType: null,
    })

    expect(result.result.consecutiveMisses).toBe(1)
    expect(result.result.isDisqualified).toBe(false)
  })

  it('存在しない試合はエラーになる', async () => {
    const user = await createUser({ name: 'エラーテスト' })
    userIds.push(user.id)
    const team = await createTeam({ name: 'エラーチーム' })
    teamIds.push(team.id)

    await expect(
      recordThrow('non-existent-code', {
        userId: user.id,
        teamId: team.id,
        skittlesKnocked: [5],
        faultType: null,
      })
    ).rejects.toThrow('試合が見つかりません')
  })
})

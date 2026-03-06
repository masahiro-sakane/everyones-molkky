import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { createTestDb } from '@/test/factories'
import { createMatch, getMatchByShareCode, listMatches, finishMatch } from '@/services/matchService'
import { createTeam } from '@/services/teamService'

const hasDb = !!process.env.DATABASE_URL

describe.skipIf(!hasDb)('matchService 統合テスト', () => {
  const { db, pool } = createTestDb()
  const teamIds: string[] = []
  const matchIds: string[] = []

  afterEach(async () => {
    for (const id of matchIds) {
      await db.match.deleteMany({ where: { id } }).catch(() => {})
    }
    for (const id of teamIds) {
      await db.team.deleteMany({ where: { id } }).catch(() => {})
    }
    matchIds.length = 0
    teamIds.length = 0
  })

  afterAll(async () => {
    await db.$disconnect()
    await pool.end()
  })

  async function setupTeams() {
    const teamA = await createTeam({ name: `試合テームA_${Date.now()}` })
    const teamB = await createTeam({ name: `試合チームB_${Date.now()}` })
    teamIds.push(teamA.id, teamB.id)
    return [teamA.id, teamB.id]
  }

  it('試合を作成できる', async () => {
    const [teamAId, teamBId] = await setupTeams()
    const match = await createMatch({ matchType: 'TEAM', teamIds: [teamAId, teamBId] })
    matchIds.push(match.id)

    expect(match.status).toBe('IN_PROGRESS')
    expect(match.matchTeams).toHaveLength(2)
    expect(match.sets).toHaveLength(1)
    expect(match.sets[0].turns).toHaveLength(1)
  })

  it('shareCodeで試合を取得できる', async () => {
    const [teamAId, teamBId] = await setupTeams()
    const match = await createMatch({ matchType: 'TEAM', teamIds: [teamAId, teamBId] })
    matchIds.push(match.id)

    const found = await getMatchByShareCode(match.shareCode)
    expect(found?.id).toBe(match.id)
    expect(found?.shareCode).toBe(match.shareCode)
  })

  it('存在しないshareCodeはnullを返す', async () => {
    const result = await getMatchByShareCode('non-existent-code')
    expect(result).toBeNull()
  })

  it('試合一覧を取得できる', async () => {
    const [teamAId, teamBId] = await setupTeams()
    const match = await createMatch({ matchType: 'TEAM', teamIds: [teamAId, teamBId] })
    matchIds.push(match.id)

    const matches = await listMatches()
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('2チーム未満で試合作成はエラーになる', async () => {
    const teamA = await createTeam({ name: `単チーム_${Date.now()}` })
    teamIds.push(teamA.id)
    await expect(createMatch({ matchType: 'TEAM', teamIds: [teamA.id] })).rejects.toThrow()
  })

  it('試合を終了できる', async () => {
    const [teamAId, teamBId] = await setupTeams()
    const match = await createMatch({ matchType: 'TEAM', teamIds: [teamAId, teamBId] })
    matchIds.push(match.id)

    const finished = await finishMatch(match.id)
    expect(finished.status).toBe('FINISHED')
  })
})

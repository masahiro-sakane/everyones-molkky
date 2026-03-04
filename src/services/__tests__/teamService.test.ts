import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { createTestDb } from '@/test/factories'
import {
  createTeam,
  getTeamById,
  listTeams,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
} from '@/services/teamService'
import { createUser } from '@/services/userService'

const hasDb = !!process.env.DATABASE_URL

describe.skipIf(!hasDb)('teamService 統合テスト', () => {
  const { db, pool } = createTestDb()
  const teamIds: string[] = []
  const userIds: string[] = []

  afterEach(async () => {
    for (const id of teamIds) {
      await db.team.deleteMany({ where: { id } }).catch(() => {})
    }
    for (const id of userIds) {
      await db.user.deleteMany({ where: { id } }).catch(() => {})
    }
    teamIds.length = 0
    userIds.length = 0
  })

  afterAll(async () => {
    await db.$disconnect()
    await pool.end()
  })

  it('チームを作成できる', async () => {
    const team = await createTeam({ name: 'テストチームX' })
    teamIds.push(team.id)
    expect(team.name).toBe('テストチームX')
    expect(team.members).toEqual([])
  })

  it('IDでチームを取得できる', async () => {
    const created = await createTeam({ name: '取得テストチーム' })
    teamIds.push(created.id)

    const found = await getTeamById(created.id)
    expect(found?.name).toBe('取得テストチーム')
  })

  it('存在しないIDはnullを返す', async () => {
    const result = await getTeamById('non-existent-id')
    expect(result).toBeNull()
  })

  it('チーム一覧を取得できる', async () => {
    const team = await createTeam({ name: '一覧チーム' })
    teamIds.push(team.id)

    const teams = await listTeams()
    expect(teams.length).toBeGreaterThanOrEqual(1)
  })

  it('メンバーを追加できる', async () => {
    const team = await createTeam({ name: 'メンバー追加チーム' })
    teamIds.push(team.id)

    const user = await createUser({ name: 'メンバー追加テスト' })
    userIds.push(user.id)

    const member = await addTeamMember(team.id, { userId: user.id, role: 'captain' })
    expect(member.user.name).toBe('メンバー追加テスト')
    expect(member.role).toBe('captain')
  })

  it('メンバーを削除できる', async () => {
    const team = await createTeam({ name: 'メンバー削除チーム' })
    teamIds.push(team.id)

    const user = await createUser({ name: 'メンバー削除テスト' })
    userIds.push(user.id)

    await addTeamMember(team.id, { userId: user.id, role: 'member' })
    await removeTeamMember(team.id, user.id)

    const updated = await getTeamById(team.id)
    expect(updated?.members).toHaveLength(0)
  })

  it('チームを削除できる', async () => {
    const team = await createTeam({ name: '削除チーム' })
    await deleteTeam(team.id)
    const found = await getTeamById(team.id)
    expect(found).toBeNull()
  })
})

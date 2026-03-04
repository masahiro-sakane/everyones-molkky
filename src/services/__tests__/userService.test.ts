import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createTestDb } from '@/test/factories'
import { createUser, getUserById, listUsers, deleteUser } from '@/services/userService'

// このファイルはDBが必要な統合テスト
// DATABASE_URL環境変数が設定されている場合のみ実行
const hasDb = !!process.env.DATABASE_URL

describe.skipIf(!hasDb)('userService 統合テスト', () => {
  const { db, pool } = createTestDb()
  const createdIds: string[] = []

  afterEach(async () => {
    // テストデータのクリーンアップ
    for (const id of createdIds) {
      await db.user.deleteMany({ where: { id } }).catch(() => {})
    }
    createdIds.length = 0
  })

  afterAll(async () => {
    await db.$disconnect()
    await pool.end()
  })

  it('ユーザーを作成できる', async () => {
    const user = await createUser({ name: 'テスト太郎' })
    createdIds.push(user.id)
    expect(user.name).toBe('テスト太郎')
    expect(user.id).toBeDefined()
  })

  it('IDでユーザーを取得できる', async () => {
    const created = await createUser({ name: 'テスト花子' })
    createdIds.push(created.id)

    const found = await getUserById(created.id)
    expect(found?.name).toBe('テスト花子')
  })

  it('存在しないIDはnullを返す', async () => {
    const result = await getUserById('non-existent-id')
    expect(result).toBeNull()
  })

  it('ユーザー一覧を取得できる', async () => {
    const user1 = await createUser({ name: '一覧テスト1' })
    const user2 = await createUser({ name: '一覧テスト2' })
    createdIds.push(user1.id, user2.id)

    const users = await listUsers()
    expect(users.length).toBeGreaterThanOrEqual(2)
  })

  it('バリデーションエラーで空の名前はエラーになる', async () => {
    await expect(createUser({ name: '' })).rejects.toThrow()
  })

  it('ユーザーを削除できる', async () => {
    const user = await createUser({ name: '削除テスト' })
    await deleteUser(user.id)
    const found = await getUserById(user.id)
    expect(found).toBeNull()
  })
})

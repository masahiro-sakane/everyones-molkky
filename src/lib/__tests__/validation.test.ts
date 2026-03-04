import { describe, it, expect } from 'vitest'
import {
  createUserSchema,
  createTeamSchema,
  addTeamMemberSchema,
  createMatchSchema,
  recordThrowSchema,
} from '@/lib/validation'

describe('createUserSchema', () => {
  it('有効なユーザーデータを通過させる', () => {
    const result = createUserSchema.safeParse({ name: '田中' })
    expect(result.success).toBe(true)
  })

  it('名前が空の場合はエラーになる', () => {
    const result = createUserSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('名前が51文字以上の場合はエラーになる', () => {
    const result = createUserSchema.safeParse({ name: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('無効なURLのavatarUrlはエラーになる', () => {
    const result = createUserSchema.safeParse({ name: '田中', avatarUrl: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})

describe('createTeamSchema', () => {
  it('有効なチームデータを通過させる', () => {
    const result = createTeamSchema.safeParse({ name: 'チームA' })
    expect(result.success).toBe(true)
  })

  it('チーム名が空の場合はエラーになる', () => {
    const result = createTeamSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})

describe('createMatchSchema', () => {
  it('2チーム以上で有効になる', () => {
    const result = createMatchSchema.safeParse({ teamIds: ['team1', 'team2'] })
    expect(result.success).toBe(true)
  })

  it('1チームではエラーになる', () => {
    const result = createMatchSchema.safeParse({ teamIds: ['team1'] })
    expect(result.success).toBe(false)
  })
})

describe('recordThrowSchema', () => {
  it('有効な投擲データを通過させる', () => {
    const result = recordThrowSchema.safeParse({
      userId: 'user1',
      teamId: 'team1',
      skittlesKnocked: [5],
      faultType: null,
    })
    expect(result.success).toBe(true)
  })

  it('0本倒し（ミス）が有効になる', () => {
    const result = recordThrowSchema.safeParse({
      userId: 'user1',
      teamId: 'team1',
      skittlesKnocked: [],
      faultType: null,
    })
    expect(result.success).toBe(true)
  })

  it('スキットル番号が13以上の場合はエラーになる', () => {
    const result = recordThrowSchema.safeParse({
      userId: 'user1',
      teamId: 'team1',
      skittlesKnocked: [13],
    })
    expect(result.success).toBe(false)
  })

  it('スキットル番号が0以下の場合はエラーになる', () => {
    const result = recordThrowSchema.safeParse({
      userId: 'user1',
      teamId: 'team1',
      skittlesKnocked: [0],
    })
    expect(result.success).toBe(false)
  })

  it('重複したスキットル番号はエラーになる', () => {
    const result = recordThrowSchema.safeParse({
      userId: 'user1',
      teamId: 'team1',
      skittlesKnocked: [5, 5],
    })
    expect(result.success).toBe(false)
  })

  it('有効なfaultTypeが通過する', () => {
    const validFaults = ['MISS', 'DROP', 'STEP_OVER', 'WRONG_ORDER'] as const
    for (const fault of validFaults) {
      const result = recordThrowSchema.safeParse({
        userId: 'user1',
        teamId: 'team1',
        skittlesKnocked: [],
        faultType: fault,
      })
      expect(result.success).toBe(true)
    }
  })

  it('無効なfaultTypeはエラーになる', () => {
    const result = recordThrowSchema.safeParse({
      userId: 'user1',
      teamId: 'team1',
      skittlesKnocked: [],
      faultType: 'INVALID',
    })
    expect(result.success).toBe(false)
  })
})

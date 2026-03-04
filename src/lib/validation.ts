import { z } from 'zod'

// ユーザー作成
export const createUserSchema = z.object({
  name: z.string().min(1, '名前は1文字以上で入力してください').max(50, '名前は50文字以内で入力してください'),
  avatarUrl: z.string().url('有効なURLを入力してください').optional(),
})

// ユーザー更新
export const updateUserSchema = z.object({
  name: z.string().min(1, '名前は1文字以上で入力してください').max(50, '名前は50文字以内で入力してください'),
})

// チーム作成
export const createTeamSchema = z.object({
  name: z.string().min(1, 'チーム名は1文字以上で入力してください').max(50, 'チーム名は50文字以内で入力してください'),
})

// チームメンバー追加
export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDは必須です'),
  role: z.enum(['captain', 'member']).optional().default('member'),
})

// 試合作成
export const createMatchSchema = z.object({
  teamIds: z
    .array(z.string().min(1))
    .min(2, '試合には2チーム以上が必要です')
    .max(10, '試合には10チーム以下が必要です'),
})

// 有効なスキットル番号（1〜12）
const skittleNumberSchema = z.number().int().min(1).max(12)

// 投擲記録
export const recordThrowSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDは必須です'),
  teamId: z.string().min(1, 'チームIDは必須です'),
  skittlesKnocked: z
    .array(skittleNumberSchema)
    .max(12, '倒せるスキットルは12本以下です')
    .refine(
      (arr) => new Set(arr).size === arr.length,
      '同じスキットル番号を重複して指定することはできません'
    ),
  faultType: z.enum(['MISS', 'DROP', 'STEP_OVER', 'WRONG_ORDER']).nullable().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>
export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type RecordThrowInput = z.infer<typeof recordThrowSchema>

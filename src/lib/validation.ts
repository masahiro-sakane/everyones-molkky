import { z } from 'zod'

// ユーザー作成
export const createUserSchema = z.object({
  name: z.string().min(1, '名前は1文字以上で入力してください').max(50, '名前は50文字以内で入力してください'),
  image: z.string().url('有効なURLを入力してください').optional(),
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

// 試合作成（チーム戦）
export const createMatchSchema = z.object({
  matchType: z.enum(['TEAM', 'SOLO']).optional().default('TEAM'),
  teamIds: z
    .array(z.string().min(1))
    .min(2, '試合には2チーム以上が必要です')
    .max(10, '試合には10チーム以下が必要です'),
  // チームIDをキー、メンバーのuserIdリストを値とする投擲順序マップ
  memberOrders: z.record(z.string(), z.array(z.string())).optional(),
  // 制限ルール
  limitType: z.enum(['NONE', 'TURNS', 'TIME']).optional(),
  turnLimit: z.number().int().min(1).max(100).optional(),
  timeLimitMinutes: z.number().int().min(1).max(180).optional(),
  // ゲーム数（1セット = 1ゲーム）
  totalSets: z.number().int().min(1).max(10).optional().default(1),
})

// 試合作成（個人戦）
export const createSoloMatchSchema = z.object({
  matchType: z.literal('SOLO'),
  playerIds: z
    .array(z.string().min(1))
    .min(2, '個人戦には2人以上が必要です')
    .max(10, '個人戦には10人以下が必要です'),
  // 制限ルール
  limitType: z.enum(['NONE', 'TURNS', 'TIME']).optional(),
  turnLimit: z.number().int().min(1).max(100).optional(),
  timeLimitMinutes: z.number().int().min(1).max(180).optional(),
  // ゲーム数
  totalSets: z.number().int().min(1).max(10).optional().default(1),
})

// 有効なスキットル番号（1〜12）または複数本モードのセンチネル（0）
const skittleNumberSchema = z.number().int().min(0).max(12)

// 投擲記録
// skittlesKnocked の規約:
//   - 空配列: ミス（0点）
//   - 長さ1かつ要素が1〜12: そのスキットル1本のみ倒した（1本モード入力）
//   - 長さ2以上で要素が1〜12: 複数本倒した（番号特定あり、得点=本数）
//   - 0 を含む配列: 複数本モード入力（番号特定なし、得点=本数）
//     例: 3本倒しは [0, 0, 0]
export const recordThrowSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDは必須です'),
  teamId: z.string().min(1, 'チームIDは必須です'),
  skittlesKnocked: z
    .array(skittleNumberSchema)
    .max(12, '倒せるスキットルは12本以下です')
    .refine((arr) => {
      // 0（センチネル）と1-12の番号を混在させない
      const hasZero = arr.includes(0)
      const hasNonZero = arr.some((v) => v > 0)
      if (hasZero && hasNonZero) return false
      // 0 を含まない場合のみ番号の重複を禁止
      if (!hasZero) return new Set(arr).size === arr.length
      return true
    }, 'スキットル番号と複数本モードの入力を混在させることはできません'),
  faultType: z.enum(['MISS', 'DROP', 'STEP_OVER', 'WRONG_ORDER']).nullable().optional(),
})

// 投擲修正（得点のみ変更可能）
export const updateThrowSchema = z.object({
  skittlesKnocked: z
    .array(skittleNumberSchema)
    .max(12, '倒せるスキットルは12本以下です')
    .refine((arr) => {
      const hasZero = arr.includes(0)
      const hasNonZero = arr.some((v) => v > 0)
      if (hasZero && hasNonZero) return false
      if (!hasZero) return new Set(arr).size === arr.length
      return true
    }, 'スキットル番号と複数本モードの入力を混在させることはできません'),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>
export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type CreateSoloMatchInput = z.infer<typeof createSoloMatchSchema>
export type RecordThrowInput = z.infer<typeof recordThrowSchema>

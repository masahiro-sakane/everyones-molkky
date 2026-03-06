'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createMatch, createSoloMatch } from '@/services/matchService'
import { recordThrow } from '@/services/scoreService'
import { createMatchSchema, createSoloMatchSchema, recordThrowSchema } from '@/lib/validation'
import { ZodError } from 'zod'

export type MatchActionState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createMatchAction(
  _prevState: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const matchType = formData.get('matchType') as string | null

  // 個人戦の場合
  if (matchType === 'SOLO') {
    const playerIds = formData.getAll('playerIds') as string[]
    const limitTypeRaw = formData.get('limitType') as string | null
    const turnLimitRaw = formData.get('turnLimit')
    const timeLimitMinutesRaw = formData.get('timeLimitMinutes')

    const parsed = createSoloMatchSchema.safeParse({
      matchType: 'SOLO',
      playerIds,
      limitType: limitTypeRaw ?? 'NONE',
      turnLimit: turnLimitRaw ? Number(turnLimitRaw) : undefined,
      timeLimitMinutes: timeLimitMinutesRaw ? Number(timeLimitMinutesRaw) : undefined,
    })
    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
    }

    try {
      const match = await createSoloMatch(parsed.data)
      revalidatePath('/matches')
      redirect(`/matches/${match.shareCode}`)
    } catch (error) {
      if (error instanceof ZodError) {
        return { errors: error.flatten().fieldErrors as Record<string, string[]> }
      }
      throw error
    }
  }

  // チーム戦の場合
  const teamIds = formData.getAll('teamIds') as string[]

  // 各チームのメンバー投擲順を取得（キー: memberOrder_{teamId}、値: ユーザーIDのJSON配列）
  const memberOrders: Record<string, string[]> = {}
  for (const teamId of teamIds) {
    const raw = formData.get(`memberOrder_${teamId}`)
    if (raw) {
      try {
        memberOrders[teamId] = JSON.parse(raw as string)
      } catch {
        // パース失敗は無視（デフォルト順を使用）
      }
    }
  }

  const limitTypeRaw = formData.get('limitType') as string | null
  const turnLimitRaw = formData.get('turnLimit')
  const timeLimitMinutesRaw = formData.get('timeLimitMinutes')

  const parsed = createMatchSchema.safeParse({
    matchType: 'TEAM',
    teamIds,
    memberOrders: Object.keys(memberOrders).length > 0 ? memberOrders : undefined,
    limitType: limitTypeRaw ?? 'NONE',
    turnLimit: turnLimitRaw ? Number(turnLimitRaw) : undefined,
    timeLimitMinutes: timeLimitMinutesRaw ? Number(timeLimitMinutesRaw) : undefined,
  })
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const match = await createMatch(parsed.data)
    revalidatePath('/matches')
    redirect(`/matches/${match.shareCode}`)
  } catch (error) {
    if (error instanceof ZodError) {
      return { errors: error.flatten().fieldErrors as Record<string, string[]> }
    }
    throw error
  }
}

export async function recordThrowAction(
  shareCode: string,
  _prevState: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const skittlesRaw = formData.get('skittlesKnocked')
  const skittlesKnocked: number[] = skittlesRaw
    ? JSON.parse(skittlesRaw as string)
    : []

  const raw = {
    userId: formData.get('userId'),
    teamId: formData.get('teamId'),
    skittlesKnocked,
    faultType: formData.get('faultType') || null,
  }

  const parsed = recordThrowSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await recordThrow(shareCode, parsed.data)
    revalidatePath(`/matches/${shareCode}`)
    return {}
  } catch (error) {
    if (error instanceof Error) {
      return { message: error.message }
    }
    return { message: 'エラーが発生しました。' }
  }
}

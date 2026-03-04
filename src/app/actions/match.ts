'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createMatch } from '@/services/matchService'
import { recordThrow } from '@/services/scoreService'
import { createMatchSchema, recordThrowSchema } from '@/lib/validation'
import { ZodError } from 'zod'

export type MatchActionState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createMatchAction(
  _prevState: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const teamIds = formData.getAll('teamIds') as string[]

  const parsed = createMatchSchema.safeParse({ teamIds })
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

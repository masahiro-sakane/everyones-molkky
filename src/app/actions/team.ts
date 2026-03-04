'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createTeam, addTeamMember, removeTeamMember, deleteTeam } from '@/services/teamService'
import { createUser } from '@/services/userService'
import { createTeamSchema, addTeamMemberSchema, createUserSchema } from '@/lib/validation'
import { ZodError } from 'zod'

export type ActionState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createTeamAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
  }

  const parsed = createTeamSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const team = await createTeam(parsed.data)
    revalidatePath('/teams')
    redirect(`/teams/${team.id}`)
  } catch (error) {
    if (error instanceof ZodError) {
      return { errors: error.flatten().fieldErrors as Record<string, string[]> }
    }
    // redirect() throws internally — re-throw it
    throw error
  }
}

export async function createUserAndAddMemberAction(
  teamId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
    avatarUrl: formData.get('avatarUrl') || undefined,
  }

  const userParsed = createUserSchema.safeParse(raw)
  if (!userParsed.success) {
    return {
      errors: userParsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const user = await createUser(userParsed.data)
    const memberParsed = addTeamMemberSchema.safeParse({ userId: user.id })
    if (!memberParsed.success) {
      return { errors: memberParsed.error.flatten().fieldErrors as Record<string, string[]> }
    }
    await addTeamMember(teamId, memberParsed.data)
    revalidatePath(`/teams/${teamId}`)
    return { message: 'メンバーを追加しました' }
  } catch (error) {
    if (error instanceof ZodError) {
      return { errors: error.flatten().fieldErrors as Record<string, string[]> }
    }
    return { message: 'エラーが発生しました。もう一度お試しください。' }
  }
}

export async function addExistingMemberAction(
  teamId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = { userId: formData.get('userId') }

  const parsed = addTeamMemberSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await addTeamMember(teamId, parsed.data)
    revalidatePath(`/teams/${teamId}`)
    return { message: 'メンバーを追加しました' }
  } catch {
    return { message: 'このユーザーはすでにメンバーです。' }
  }
}

export async function removeMemberAction(teamId: string, userId: string): Promise<ActionState> {
  try {
    await removeTeamMember(teamId, userId)
    revalidatePath(`/teams/${teamId}`)
    return { message: 'メンバーを削除しました' }
  } catch {
    return { message: 'メンバーの削除に失敗しました。' }
  }
}

export async function deleteTeamAction(id: string): Promise<ActionState> {
  try {
    await deleteTeam(id)
    revalidatePath('/teams')
    redirect('/teams')
  } catch (error) {
    throw error
  }
}

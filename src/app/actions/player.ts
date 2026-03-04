'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createUser, updateUser, deleteUser } from '@/services/userService'
import { createUserSchema, updateUserSchema } from '@/lib/validation'
import { ZodError } from 'zod'

export type ActionState = {
  errors?: Record<string, string[]>
  message?: string
}

export async function createPlayerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
  }

  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await createUser(parsed.data)
    revalidatePath('/players')
    redirect('/players')
  } catch (error) {
    if (error instanceof ZodError) {
      return { errors: error.flatten().fieldErrors as Record<string, string[]> }
    }
    throw error
  }
}

export async function updatePlayerAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
  }

  const parsed = updateUserSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await updateUser(id, parsed.data)
    revalidatePath('/players')
    redirect('/players')
  } catch (error) {
    if (error instanceof ZodError) {
      return { errors: error.flatten().fieldErrors as Record<string, string[]> }
    }
    throw error
  }
}

export async function deletePlayerAction(id: string): Promise<ActionState> {
  try {
    await deleteUser(id)
    revalidatePath('/players')
    return {}
  } catch {
    return { message: 'プレイヤーの削除に失敗しました。' }
  }
}

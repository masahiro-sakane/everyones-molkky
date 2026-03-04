import { db } from '@/lib/db'
import { createUserSchema, updateUserSchema } from '@/lib/validation'
import type { z } from 'zod'

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export async function createUser(input: CreateUserInput) {
  const validated = createUserSchema.parse(input)
  return db.user.create({
    data: {
      name: validated.name,
      avatarUrl: validated.avatarUrl ?? null,
    },
  })
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      teamMembers: {
        include: { team: true },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })
}

export async function listUsers() {
  return db.user.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function listUsersWithTeams() {
  return db.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      teamMembers: {
        include: { team: true },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const validated = updateUserSchema.parse(input)
  return db.user.update({
    where: { id },
    data: { name: validated.name },
  })
}

export async function deleteUser(id: string) {
  return db.user.delete({
    where: { id },
  })
}

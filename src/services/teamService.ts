import { db } from '@/lib/db'
import { createTeamSchema, addTeamMemberSchema } from '@/lib/validation'
import type { z } from 'zod'

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>

export async function createTeam(input: CreateTeamInput) {
  const validated = createTeamSchema.parse(input)
  return db.team.create({
    data: { name: validated.name },
    include: { members: { include: { user: true } } },
  })
}

export async function getTeamById(id: string) {
  return db.team.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })
}

export async function listTeams() {
  return db.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      members: {
        include: { user: true },
      },
    },
  })
}

export async function updateTeam(id: string, input: Partial<CreateTeamInput>) {
  const validated = createTeamSchema.partial().parse(input)
  return db.team.update({
    where: { id },
    data: validated,
    include: { members: { include: { user: true } } },
  })
}

export async function addTeamMember(teamId: string, input: AddTeamMemberInput) {
  const validated = addTeamMemberSchema.parse(input)
  return db.teamMember.create({
    data: {
      teamId,
      userId: validated.userId,
      role: validated.role ?? 'member',
    },
    include: { user: true },
  })
}

export async function removeTeamMember(teamId: string, userId: string) {
  return db.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  })
}

export async function deleteTeam(id: string) {
  return db.team.delete({ where: { id } })
}

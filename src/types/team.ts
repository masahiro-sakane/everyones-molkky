export type TeamMemberRole = 'captain' | 'member'

export type TeamMember = {
  id: string
  teamId: string
  userId: string
  role: TeamMemberRole
  joinedAt: Date
}

export type Team = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export type TeamWithMembers = Team & {
  members: (TeamMember & {
    user: {
      id: string
      name: string
      avatarUrl: string | null
    }
  })[]
}

export type CreateTeamInput = {
  name: string
}

export type UpdateTeamInput = Partial<CreateTeamInput>

export type AddTeamMemberInput = {
  userId: string
  role?: TeamMemberRole
}

export type User = {
  id: string
  name: string
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateUserInput = {
  name: string
  avatarUrl?: string
}

export type UpdateUserInput = Partial<CreateUserInput>

export type User = {
  id: string
  name: string | null
  image: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateUserInput = {
  name: string
  image?: string
}

export type UpdateUserInput = Partial<CreateUserInput>

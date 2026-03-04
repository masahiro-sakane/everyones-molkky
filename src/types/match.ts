export type MatchStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'
export type SetStatus = 'IN_PROGRESS' | 'FINISHED'

export type Match = {
  id: string
  status: MatchStatus
  shareCode: string
  createdAt: Date
  updatedAt: Date
}

export type MatchTeam = {
  id: string
  matchId: string
  teamId: string
  order: number
}

export type Set = {
  id: string
  matchId: string
  setNumber: number
  status: SetStatus
  winnerId: string | null
}

export type Turn = {
  id: string
  setId: string
  turnNumber: number
}

export type Throw = {
  id: string
  turnId: string
  userId: string
  teamId: string
  throwOrder: number
  skittlesKnocked: number[]
  score: number
  isFault: boolean
  faultType: string | null
  createdAt: Date
}

export type CreateMatchInput = {
  teamIds: string[]
}

export type RecordThrowInput = {
  userId: string
  teamId: string
  skittlesKnocked: number[]
  faultType?: string | null
}

export type MatchWithDetails = Match & {
  matchTeams: (MatchTeam & {
    team: {
      id: string
      name: string
    }
  })[]
  sets: (Set & {
    turns: (Turn & {
      throws: Throw[]
    })[]
  })[]
}

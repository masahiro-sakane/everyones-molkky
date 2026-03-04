export type FaultType = 'MISS' | 'DROP' | 'STEP_OVER' | 'WRONG_ORDER'

export type ThrowInput = {
  skittlesKnocked: number[]
  faultType?: FaultType | null
}

export type ThrowResult = {
  score: number
  totalScore: number
  consecutiveMisses: number
  isDisqualified: boolean
  isWinner: boolean
  isFault: boolean
  faultType: FaultType | null
}

export type ProcessThrowParams = {
  currentScore: number
  consecutiveMisses: number
  throwInput: ThrowInput
}

export type TeamScore = {
  teamId: string
  teamName: string
  totalScore: number
  consecutiveMisses: number
  isDisqualified: boolean
}

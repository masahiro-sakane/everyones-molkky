export type PinAnalysisResult = {
  standingPins: number[]
  fallenPins: number[]
  confidence: number
  rawResponse?: string
}

export type AdviceContext = {
  remainingScore: number
  consecutiveMisses: number
  opponentRemainingScores: number[]
  isLastChance: boolean
}

export type ThrowAdvice = {
  targetPins: number[]
  expectedScore: number
  resultingTotal: number
  winsNow: boolean
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
}

export type PinAnalysisResult = {
  standingPins: number[]
  fallenPins: number[]
  confidence: number
  rawResponse?: string
}

/** 投擲者の技術プロフィール（ユーザーが入力） */
export type ThrowerProfile = {
  /** 精度レベル */
  level: 'beginner' | 'intermediate' | 'advanced'
  /** 縦投げができるか */
  canThrowVertical: boolean
  /** 確実に狙える最大距離（m）。nullは不明 */
  maxReliableDistance: number | null
}

export type AdviceContext = {
  remainingScore: number
  consecutiveMisses: number
  opponentRemainingScores: number[]
  isLastChance: boolean
  /** 現在のラウンド数（ターン数） */
  currentRound: number
  /** 残りラウンド数（制限あり試合のみ。nullは無制限） */
  remainingRounds: number | null
  /** 投擲者プロフィール */
  thrower: ThrowerProfile
  /** 相手チームの連続ミス数（妨害判断に使用） */
  opponentConsecutiveMisses: number[]
}

export type ThrowAdvice = {
  targetPins: number[]
  expectedScore: number
  resultingTotal: number
  winsNow: boolean
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
  /** 助言の戦略的意図 */
  intent: 'win' | 'score' | 'safe' | 'interfere'
}

export const DEFAULT_THROWER_PROFILE: ThrowerProfile = {
  level: 'intermediate',
  canThrowVertical: false,
  maxReliableDistance: null,
}

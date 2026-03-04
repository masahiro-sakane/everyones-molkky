import type { FaultType, ProcessThrowParams, ThrowResult } from '@/types/score'

const WINNING_SCORE = 50
const RESET_SCORE = 25
const FAULT_RESET_THRESHOLD = 37
const MAX_CONSECUTIVE_MISSES = 3

/**
 * 1投の基本得点を計算する
 * - 1本倒し: そのスキットルの番号
 * - 複数本倒し: 倒した本数
 * - 0本: 0点
 */
export function calculateThrowScore(skittlesKnocked: number[]): number {
  if (skittlesKnocked.length === 0) return 0
  if (skittlesKnocked.length === 1) return skittlesKnocked[0]
  return skittlesKnocked.length
}

/**
 * オーバースコアルールを適用する
 * - 合計がちょうど50点: 勝利
 * - 合計が50点超過: 25点にリセット
 */
export function applyOverScoreRule(
  currentScore: number,
  throwScore: number
): { newScore: number; isWinner: boolean } {
  const total = currentScore + throwScore

  if (total === WINNING_SCORE) {
    return { newScore: WINNING_SCORE, isWinner: true }
  }

  if (total > WINNING_SCORE) {
    return { newScore: RESET_SCORE, isWinner: false }
  }

  return { newScore: total, isWinner: false }
}

/**
 * 連続ミスをチェックする
 * - 3回連続ミスで失格
 * - 得点が入れば連続ミスをリセット
 */
export function checkConsecutiveMisses(
  consecutiveMisses: number,
  throwScore: number
): { newConsecutiveMisses: number; isDisqualified: boolean } {
  if (throwScore > 0) {
    return { newConsecutiveMisses: 0, isDisqualified: false }
  }

  const newConsecutiveMisses = consecutiveMisses + 1
  const isDisqualified = newConsecutiveMisses >= MAX_CONSECUTIVE_MISSES

  return { newConsecutiveMisses, isDisqualified }
}

/**
 * フォルトルールを適用してスコアを返す
 * - STEP_OVER（踏み越え）かつ現在スコアが37点以上: 25点にリセット
 * - その他のフォルト: スコアを変更しない
 */
export function applyFaultRule(
  currentScore: number,
  faultType: FaultType | null
): number {
  if (faultType === 'STEP_OVER' && currentScore >= FAULT_RESET_THRESHOLD) {
    return RESET_SCORE
  }
  return currentScore
}

/**
 * 1投を全ルール適用して処理する
 */
export function processThrow(params: ProcessThrowParams): ThrowResult {
  const { currentScore, consecutiveMisses, throwInput } = params
  const { skittlesKnocked, faultType = null } = throwInput

  const isFault = faultType !== null
  const baseScore = calculateThrowScore(skittlesKnocked)

  // フォルトがある場合はbaseScoreは0扱い（スコアに加算しない）
  // STEP_OVERの場合は別途スコアリセットを適用
  const effectiveScore = isFault ? 0 : baseScore

  // STEP_OVERフォルトのスコアリセット（投擲前のスコアに対して適用）
  const scoreAfterFault = applyFaultRule(currentScore, faultType)

  // オーバースコアルール適用（フォルト時はeffectiveScore=0なので加算なし）
  const { newScore, isWinner } = applyOverScoreRule(scoreAfterFault, effectiveScore)

  // 連続ミスチェック（フォルト時も0点なのでミスカウントが増える）
  const { newConsecutiveMisses, isDisqualified } = checkConsecutiveMisses(
    consecutiveMisses,
    effectiveScore
  )

  return {
    score: effectiveScore,
    totalScore: newScore,
    consecutiveMisses: newConsecutiveMisses,
    isDisqualified,
    isWinner,
    isFault,
    faultType: faultType ?? null,
  }
}

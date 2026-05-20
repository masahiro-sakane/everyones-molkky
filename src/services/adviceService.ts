import type { AdviceContext, ThrowAdvice } from '@/types/vision'

const WINNING_SCORE = 50
const PENALIZED_SCORE = 25
const MAX_PINS = 12

export function calcThrowScore(pins: number[]): number {
  if (pins.length === 0) return 0
  if (pins.length === 1) return pins[0]
  return pins.length
}

type Candidate = {
  targetPins: number[]
  score: number
  resultingTotal: number
  winsNow: boolean
  overshot: boolean
}

function buildCandidates(standingPins: number[], currentScore: number): Candidate[] {
  const candidates: Candidate[] = []

  // 1本ずつ狙う
  for (const pin of standingPins) {
    const score = pin
    const next = currentScore + score
    candidates.push({
      targetPins: [pin],
      score,
      resultingTotal: next > WINNING_SCORE ? PENALIZED_SCORE : next,
      winsNow: next === WINNING_SCORE,
      overshot: next > WINNING_SCORE,
    })
  }

  // 複数本まとめて狙う（隣接する複数本 → 本数が得点）
  const n = standingPins.length
  for (let size = 2; size <= Math.min(n, MAX_PINS); size++) {
    // 全組み合わせ（C(n, size)）のうち本数=sizeが得点になるパターン
    const combos = combinations(standingPins, size)
    for (const combo of combos) {
      const score = size
      const next = currentScore + score
      candidates.push({
        targetPins: combo,
        score,
        resultingTotal: next > WINNING_SCORE ? PENALIZED_SCORE : next,
        winsNow: next === WINNING_SCORE,
        overshot: next > WINNING_SCORE,
      })
    }
  }

  return candidates
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c])
  const withoutFirst = combinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

function scoreCandidate(
  c: Candidate,
  ctx: AdviceContext
): number {
  let score = 0

  // 勝利最優先
  if (c.winsNow) score += 1000

  // オーバースコアはペナルティ
  if (c.overshot) score -= 200

  // 結果スコアが残り点に近いほど良い
  const remaining = ctx.remainingScore
  const distanceToWin = Math.abs(remaining - c.score)
  score -= distanceToWin * 2

  // 連続ミス2回の場合: 多く倒せる（本数が多い）選択肢を優遇（失格回避）
  if (ctx.consecutiveMisses >= 2) {
    score += c.targetPins.length * 5
  }

  // 相手が勝ちに近い場合: 積極的にスコアを伸ばす
  const opponentMin = Math.min(...(ctx.opponentRemainingScores.length > 0 ? ctx.opponentRemainingScores : [Infinity]))
  if (opponentMin <= 10 && !c.overshot) {
    score += c.score * 3
  }

  return score
}

function riskLevel(c: Candidate, ctx: AdviceContext): 'low' | 'medium' | 'high' {
  if (c.overshot) return 'high'
  if (ctx.consecutiveMisses >= 2) return 'high'
  const remaining = ctx.remainingScore
  // 残り点より大幅に超える可能性がある1本狙いは medium
  if (c.targetPins.length === 1 && c.score > remaining) return 'medium'
  if (c.targetPins.length >= 4) return 'medium'
  return 'low'
}

function buildReason(c: Candidate, ctx: AdviceContext): string {
  const pinsLabel = c.targetPins.length === 1
    ? `${c.targetPins[0]}番`
    : `${c.targetPins.join('・')}番（${c.targetPins.length}本）`

  if (c.winsNow) return `${pinsLabel}を倒すと${WINNING_SCORE}点ちょうどで勝利！`
  if (c.overshot) return `${pinsLabel}を倒すと超過し${PENALIZED_SCORE}点に戻ります`
  if (ctx.consecutiveMisses >= 2) return `連続ミス中のため、${pinsLabel}で確実に得点しましょう`

  const remaining = ctx.remainingScore
  const after = c.resultingTotal
  return `${pinsLabel}を倒して${c.score}点獲得→合計${after}点（残り${WINNING_SCORE - after}点）`
}

function dedup(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>()
  return candidates.filter((c) => {
    const key = [...c.targetPins].sort((a, b) => a - b).join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function generateAdvice(
  standingPins: number[],
  ctx: AdviceContext
): ThrowAdvice[] {
  if (standingPins.length === 0) return []

  const currentScore = WINNING_SCORE - ctx.remainingScore
  const allCandidates = dedup(buildCandidates(standingPins, currentScore))

  const scored = allCandidates
    .map((c) => ({ c, s: scoreCandidate(c, ctx) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)

  return scored.map(({ c }) => ({
    targetPins: c.targetPins,
    expectedScore: c.score,
    resultingTotal: c.resultingTotal,
    winsNow: c.winsNow,
    reason: buildReason(c, ctx),
    riskLevel: riskLevel(c, ctx),
  }))
}

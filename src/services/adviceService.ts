import type { AdviceContext, ThrowAdvice } from '@/types/vision'

const WINNING_SCORE = 50
const PENALIZED_SCORE = 25

export function calcThrowScore(pins: number[]): number {
  if (pins.length === 0) return 0
  if (pins.length === 1) return pins[0]
  return pins.length
}

// ─── フェーズ判定 ───────────────────────────────────────────────

type Phase = 'early' | 'mid' | 'late' | 'penalty_recovery'

function getPhase(currentScore: number, wasOvershot: boolean): Phase {
  if (wasOvershot && currentScore === PENALIZED_SCORE) return 'penalty_recovery'
  if (currentScore >= 40) return 'late'
  if (currentScore >= 26) return 'mid'
  return 'early'
}

// ─── 妨害優先度 ────────────────────────────────────────────────

function calcInterferencePriority(ctx: AdviceContext): number {
  const { remainingScore, opponentRemainingScores } = ctx
  if (opponentRemainingScores.length === 0) return 0

  const myScore = WINNING_SCORE - remainingScore
  const oppMin = Math.min(...opponentRemainingScores)
  const oppMinScore = WINNING_SCORE - oppMin

  let priority = (oppMinScore / WINNING_SCORE) * 60
  if (oppMin <= 12) priority += 40  // 相手が1投で上がれる
  if (oppMin <= 6) priority += 20   // 相手が確実に上がれる範囲
  if (myScore < oppMinScore - 10) priority += 20  // 大差でリードされている

  // 自分が次の1投で上がれるなら妨害より自スコア優先
  if (remainingScore >= 1 && remainingScore <= 12) priority -= 60

  return Math.max(0, priority)
}

// ─── 候補生成 ─────────────────────────────────────────────────

type Candidate = {
  targetPins: number[]
  score: number
  resultingTotal: number
  winsNow: boolean
  overshot: boolean
  isMulti: boolean
}

function buildCandidates(standingPins: number[], currentScore: number): Candidate[] {
  const candidates: Candidate[] = []

  // 1本狙い
  for (const pin of standingPins) {
    const next = currentScore + pin
    candidates.push({
      targetPins: [pin],
      score: pin,
      resultingTotal: next > WINNING_SCORE ? PENALIZED_SCORE : next,
      winsNow: next === WINNING_SCORE,
      overshot: next > WINNING_SCORE,
      isMulti: false,
    })
  }

  // 複数本狙い（2〜6本まで。7本以上は現実的でないため省略）
  const n = standingPins.length
  const maxSize = Math.min(n, 6)
  for (let size = 2; size <= maxSize; size++) {
    for (const combo of combinations(standingPins, size)) {
      const next = currentScore + size
      candidates.push({
        targetPins: combo,
        score: size,
        resultingTotal: next > WINNING_SCORE ? PENALIZED_SCORE : next,
        winsNow: next === WINNING_SCORE,
        overshot: next > WINNING_SCORE,
        isMulti: true,
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
  return [...withFirst, ...combinations(rest, k)]
}

// ─── 距離補正（距離情報がない場合は補正なし） ──────────────────

function distanceBonus(maxReliable: number | null): number {
  // カメラ解析では距離情報が取れないため現状は補正なし
  // 将来的に距離情報が取得できた場合に使用
  if (maxReliable === null) return 0
  return 0
}

// ─── スコアリング ────────────────────────────────────────────

function scoreCandidate(c: Candidate, ctx: AdviceContext, phase: Phase, interferePriority: number): number {
  let score = 0
  const remaining = ctx.remainingScore
  const { level, canThrowVertical } = ctx.thrower

  // ── 最優先：勝利 ──
  if (c.winsNow) return 10000

  // ── オーバースコア禁止（終盤・中盤）──
  if (c.overshot) {
    if (phase === 'late' || phase === 'mid') return -9000
    score -= 300  // 序盤でもペナルティ
  }

  // ── ミス2回：失格回避最優先 ──
  if (ctx.consecutiveMisses >= 2) {
    // 複数本の方が「当たりやすい」として優遇
    score += c.isMulti ? c.targetPins.length * 20 : 30
    // 残り点を超えないことも確認
    if (!c.overshot) score += 50
    return score
  }

  // ── フェーズ別スコアリング ──
  if (phase === 'late') {
    // 終盤：残り点にぴったり合う1本狙いを最優先
    if (!c.isMulti) {
      const diff = Math.abs(remaining - c.score)
      score += 500 - diff * 50
      // 残り点ちょうどでない場合でもなるべく残り点に近い値を取る
      if (c.score <= remaining) score += 100
    } else {
      // 終盤の複数本は大幅ペナルティ（オーバーリスクが高い）
      score -= 200
    }
  } else if (phase === 'mid') {
    // 中盤：高得点1本狙いを推奨。複数本は基本禁止
    if (!c.isMulti) {
      score += c.score * 10
      // 残り点を超えない番号を優遇
      if (c.score <= remaining) score += 50
    } else {
      score -= 100  // 複数本はやや不推奨
    }
  } else if (phase === 'early' || phase === 'penalty_recovery') {
    // 序盤・ペナルティ後：精度レベルで使い分け
    if (level === 'advanced') {
      // 上級者：高得点1本狙い優先（12>11>10...）
      if (!c.isMulti) score += c.score * 12
      else score -= 20
    } else if (level === 'intermediate') {
      // 中級者：高得点1本を基本、密集複数本も検討
      if (!c.isMulti) score += c.score * 8
      else score += c.targetPins.length * 5  // 複数本も一定評価
    } else {
      // 初心者：複数本優先（当てやすさ重視）
      if (c.isMulti) score += c.targetPins.length * 15
      else score += c.score * 4
    }
  }

  // ── 縦投げ補正 ──
  // 縦投げができる場合、複数本リスクを軽減（1本狙いの精度が上がる）
  if (canThrowVertical && !c.isMulti) {
    score += 10
  }

  // ── 残り点との距離ペナルティ（全フェーズ共通） ──
  const distanceToWin = Math.abs(remaining - c.score)
  score -= distanceToWin * (phase === 'late' ? 5 : 1)

  // ── 妨害フェーズ：高得点スキットルへのペナルティ（自スコアより妨害優先） ──
  if (interferePriority >= 80) {
    // 妨害が最優先のときは自スコアアップの評価を抑制
    score -= 200
  }

  score += distanceBonus(ctx.thrower.maxReliableDistance)

  return score
}

// ─── リスク評価 ────────────────────────────────────────────────

function calcRiskLevel(c: Candidate, ctx: AdviceContext, phase: Phase): 'low' | 'medium' | 'high' {
  if (c.overshot) return 'high'
  if (ctx.consecutiveMisses >= 2) return 'high'
  if (phase === 'late' && c.isMulti) return 'high'
  if (c.targetPins.length === 1 && c.score > ctx.remainingScore && phase !== 'early') return 'medium'
  if (c.targetPins.length >= 4) return 'medium'
  return 'low'
}

// ─── 戦略的意図 ─────────────────────────────────────────────────

function calcIntent(c: Candidate, ctx: AdviceContext, interferePriority: number): ThrowAdvice['intent'] {
  if (c.winsNow) return 'win'
  if (interferePriority >= 80) return 'interfere'
  if (ctx.consecutiveMisses >= 2) return 'safe'
  return 'score'
}

// ─── 理由文 ──────────────────────────────────────────────────

function buildReason(c: Candidate, ctx: AdviceContext, phase: Phase, interferePriority: number): string {
  const pinsLabel = c.targetPins.length === 1
    ? `${c.targetPins[0]}番`
    : `${c.targetPins.join('・')}番（${c.targetPins.length}本）`

  if (c.winsNow) return `${pinsLabel}を倒すと${WINNING_SCORE}点ちょうどで勝利！`
  if (c.overshot) return `${pinsLabel}は超過して${PENALIZED_SCORE}点に戻るため避けましょう`
  if (ctx.consecutiveMisses >= 2) return `連続ミス中につき、${pinsLabel}を確実に当てることを最優先にしてください`

  if (interferePriority >= 80) {
    const oppMin = Math.min(...ctx.opponentRemainingScores)
    return `相手があと${oppMin}点で勝利のため、${pinsLabel}を妨害に使うことも検討してください`
  }

  const after = c.resultingTotal
  const nextRemaining = WINNING_SCORE - after

  if (phase === 'late') {
    if (c.score === ctx.remainingScore) return `${pinsLabel}を倒して${c.score}点獲得→${WINNING_SCORE}点で勝利！`
    return `${pinsLabel}を倒して${c.score}点獲得→合計${after}点（残り${nextRemaining}点）`
  }

  if (phase === 'early' && ctx.thrower.level === 'beginner' && c.isMulti) {
    return `${pinsLabel}をまとめて${c.score}点獲得。初心者には密集狙いが安定します`
  }

  return `${pinsLabel}を倒して${c.score}点獲得→合計${after}点（残り${nextRemaining}点）`
}

// ─── 重複排除 ─────────────────────────────────────────────────

function dedup(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>()
  return candidates.filter((c) => {
    const key = [...c.targetPins].sort((a, b) => a - b).join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── 妨害候補生成 ─────────────────────────────────────────────

function buildInterfereAdvice(ctx: AdviceContext, standingPins: number[]): ThrowAdvice | null {
  if (ctx.opponentRemainingScores.length === 0) return null
  const oppMin = Math.min(...ctx.opponentRemainingScores)

  // 相手が1本狙いできる番号を特定し、それを「飛ばす」推奨を返す
  const targetForOpp = standingPins.find((p) => p === oppMin)
  if (!targetForOpp) return null

  const currentScore = WINNING_SCORE - ctx.remainingScore
  const rawTotal = currentScore + targetForOpp
  // 50超の場合は25リセット、ちょうど50なら勝利
  const resultingTotal = rawTotal > WINNING_SCORE ? PENALIZED_SCORE : rawTotal
  const winsNow = rawTotal === WINNING_SCORE

  return {
    targetPins: [targetForOpp],
    expectedScore: targetForOpp,
    resultingTotal,
    winsNow,
    reason: winsNow
      ? `${targetForOpp}番を倒すと${WINNING_SCORE}点で勝利！（妨害も兼ねます）`
      : `相手があと${oppMin}点で勝利します。${targetForOpp}番を強く打って遠ざけることで妨害できます`,
    riskLevel: 'medium',
    intent: winsNow ? 'win' : 'interfere',
  }
}

// ─── メイン ──────────────────────────────────────────────────

export function generateAdvice(
  standingPins: number[],
  ctx: AdviceContext
): ThrowAdvice[] {
  if (standingPins.length === 0) return []

  const currentScore = WINNING_SCORE - ctx.remainingScore
  // 現在スコアが PENALIZED_SCORE(25)ちょうどの場合、直前にオーバーした可能性が高い
  const wasOvershot = currentScore === PENALIZED_SCORE
  const phase = getPhase(currentScore, wasOvershot)
  const interferePriority = calcInterferencePriority(ctx)

  const allCandidates = dedup(buildCandidates(standingPins, currentScore))

  const scored = allCandidates
    .map((c) => ({ c, s: scoreCandidate(c, ctx, phase, interferePriority) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, interferePriority >= 80 ? 2 : 3)  // 妨害時は2件にして妨害助言を挿入

  const results: ThrowAdvice[] = scored.map(({ c }) => ({
    targetPins: c.targetPins,
    expectedScore: c.score,
    resultingTotal: c.resultingTotal,
    winsNow: c.winsNow,
    reason: buildReason(c, ctx, phase, interferePriority),
    riskLevel: calcRiskLevel(c, ctx, phase),
    intent: calcIntent(c, ctx, interferePriority),
  }))

  // 妨害優先度が高い場合、妨害助言を先頭に追加
  if (interferePriority >= 80) {
    const interfere = buildInterfereAdvice(ctx, standingPins)
    if (interfere) results.unshift(interfere)
  }

  return results.slice(0, 3)
}

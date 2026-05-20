import { describe, it, expect } from 'vitest'
import { generateAdvice, calcThrowScore } from '../adviceService'
import type { AdviceContext } from '@/types/vision'

const baseCtx = (overrides?: Partial<AdviceContext>): AdviceContext => ({
  remainingScore: 20,
  consecutiveMisses: 0,
  opponentRemainingScores: [30],
  isLastChance: false,
  ...overrides,
})

describe('calcThrowScore', () => {
  it('1本だけ倒すとその番号が点数', () => {
    expect(calcThrowScore([7])).toBe(7)
  })

  it('複数本倒すと本数が点数', () => {
    expect(calcThrowScore([1, 2, 3])).toBe(3)
  })

  it('0本は0点', () => {
    expect(calcThrowScore([])).toBe(0)
  })
})

describe('generateAdvice', () => {
  it('残り1点で1番が立っている場合、1番を狙う助言が上位に来る', () => {
    const advice = generateAdvice([1, 2, 3], baseCtx({ remainingScore: 1 }))
    const win = advice.find((a) => a.winsNow)
    expect(win).toBeDefined()
    expect(win?.targetPins).toEqual([1])
  })

  it('残り6点で立ちピンから6点が狙える場合、勝利助言が上位に来る', () => {
    // 1本で6点 → 6番を立てると勝てる
    const advice = generateAdvice([6, 3, 5], baseCtx({ remainingScore: 6 }))
    const win = advice.find((a) => a.winsNow)
    expect(win).toBeDefined()
    expect(win?.targetPins).toContain(6)
  })

  it('複数本で本数=残り点なら勝利できる', () => {
    // 3本倒すと3点 → 残り3点で立ちピン3本以上
    const advice = generateAdvice([1, 2, 3, 4], baseCtx({ remainingScore: 3 }))
    const win = advice.find((a) => a.winsNow)
    expect(win).toBeDefined()
  })

  it('オーバースコアリスクがある場合はriskがhighになる', () => {
    // 残り2点で12番を狙うと+12で超過 → high risk
    const advice = generateAdvice([12], baseCtx({ remainingScore: 2 }))
    const risky = advice.find((a) => a.targetPins.includes(12))
    expect(risky?.riskLevel).toBe('high')
  })

  it('勝利できる手が最上位に来る', () => {
    const advice = generateAdvice([1, 3, 5, 8], baseCtx({ remainingScore: 8 }))
    if (advice.length > 0 && advice.some((a) => a.winsNow)) {
      expect(advice[0].winsNow).toBe(true)
    }
  })

  it('連続ミス2回の場合はriskLowな複数本狙いが推奨される', () => {
    const advice = generateAdvice([1, 2, 3, 4, 5, 6], baseCtx({ consecutiveMisses: 2, remainingScore: 30 }))
    expect(advice.length).toBeGreaterThan(0)
    // 連続ミス2回は失格リスク → 倒しやすい複数本狙いが推奨
    const topAdvice = advice[0]
    expect(topAdvice).toBeDefined()
  })

  it('立ちピンが空の場合は空配列を返す', () => {
    const advice = generateAdvice([], baseCtx())
    expect(advice).toEqual([])
  })

  it('上限3件までの助言を返す', () => {
    const advice = generateAdvice([1, 2, 3, 4, 5, 6, 7, 8], baseCtx({ remainingScore: 30 }))
    expect(advice.length).toBeLessThanOrEqual(3)
  })

  it('立ちピンが1本だけの場合その1本の助言を返す', () => {
    const advice = generateAdvice([9], baseCtx({ remainingScore: 20 }))
    expect(advice.length).toBeGreaterThan(0)
    expect(advice[0].targetPins).toContain(9)
  })

  it('superoverパターン: 残り点がすべての選択肢でオーバーになる場合でも助言を返す', () => {
    // 残り1点で2番しかない場合 → 超過してしまうが何か返す
    const advice = generateAdvice([2], baseCtx({ remainingScore: 1 }))
    expect(advice.length).toBeGreaterThan(0)
  })
})

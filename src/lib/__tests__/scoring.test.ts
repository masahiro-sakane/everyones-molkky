import { describe, it, expect } from 'vitest'
import {
  calculateThrowScore,
  applyOverScoreRule,
  checkConsecutiveMisses,
  applyFaultRule,
  processThrow,
} from '@/lib/scoring'

// ============================================================
// calculateThrowScore
// ============================================================
describe('calculateThrowScore', () => {
  it('1本だけ倒した場合はそのスキットルの番号が得点になる', () => {
    expect(calculateThrowScore([5])).toBe(5)
    expect(calculateThrowScore([12])).toBe(12)
    expect(calculateThrowScore([1])).toBe(1)
  })

  it('複数本倒した場合は倒した本数が得点になる', () => {
    expect(calculateThrowScore([1, 2])).toBe(2)
    expect(calculateThrowScore([3, 10, 4])).toBe(3)
    expect(calculateThrowScore([5, 11, 12, 6])).toBe(4)
  })

  it('0本倒した場合は0点になる', () => {
    expect(calculateThrowScore([])).toBe(0)
  })

  it('有効なスキットル番号（1〜12）を扱える', () => {
    for (let i = 1; i <= 12; i++) {
      expect(calculateThrowScore([i])).toBe(i)
    }
  })
})

// ============================================================
// applyOverScoreRule
// ============================================================
describe('applyOverScoreRule', () => {
  it('合計が50点ちょうどのとき勝利フラグがtrueになる', () => {
    const result = applyOverScoreRule(45, 5)
    expect(result.newScore).toBe(50)
    expect(result.isWinner).toBe(true)
  })

  it('合計が50点未満のとき通常通りスコアが加算される', () => {
    const result = applyOverScoreRule(30, 10)
    expect(result.newScore).toBe(40)
    expect(result.isWinner).toBe(false)
  })

  it('合計が50点を超えた場合は25点にリセットされる', () => {
    const result = applyOverScoreRule(48, 5)
    expect(result.newScore).toBe(25)
    expect(result.isWinner).toBe(false)
  })

  it('0点から50点を超えた場合も25点にリセットされる', () => {
    const result = applyOverScoreRule(0, 51)
    expect(result.newScore).toBe(25)
    expect(result.isWinner).toBe(false)
  })

  it('スコアが0のとき0点を加算しても勝利しない', () => {
    const result = applyOverScoreRule(0, 0)
    expect(result.newScore).toBe(0)
    expect(result.isWinner).toBe(false)
  })

  it('25点から25点加算でちょうど50点になり勝利する', () => {
    const result = applyOverScoreRule(25, 25)
    expect(result.newScore).toBe(50)
    expect(result.isWinner).toBe(true)
  })
})

// ============================================================
// checkConsecutiveMisses
// ============================================================
describe('checkConsecutiveMisses', () => {
  it('0点のとき連続ミス数が1増える', () => {
    const result = checkConsecutiveMisses(0, 0)
    expect(result.newConsecutiveMisses).toBe(1)
    expect(result.isDisqualified).toBe(false)
  })

  it('2回連続ミス後にまた0点で失格になる', () => {
    const result = checkConsecutiveMisses(2, 0)
    expect(result.newConsecutiveMisses).toBe(3)
    expect(result.isDisqualified).toBe(true)
  })

  it('得点があれば連続ミス数がリセットされる', () => {
    const result = checkConsecutiveMisses(2, 5)
    expect(result.newConsecutiveMisses).toBe(0)
    expect(result.isDisqualified).toBe(false)
  })

  it('1回ミス後に得点が入れば連続ミスがリセットされる', () => {
    const result = checkConsecutiveMisses(1, 3)
    expect(result.newConsecutiveMisses).toBe(0)
    expect(result.isDisqualified).toBe(false)
  })

  it('初回ミスでは失格にならない', () => {
    const result = checkConsecutiveMisses(0, 0)
    expect(result.isDisqualified).toBe(false)
  })
})

// ============================================================
// applyFaultRule
// ============================================================
describe('applyFaultRule', () => {
  describe('STEP_OVER（踏み越えフォルト）', () => {
    it('37点以上のとき踏み越えは25点にリセットされる', () => {
      const result = applyFaultRule(37, 'STEP_OVER')
      expect(result).toBe(25)
    })

    it('37点ちょうどで踏み越えは25点にリセットされる', () => {
      const result = applyFaultRule(37, 'STEP_OVER')
      expect(result).toBe(25)
    })

    it('50点ちょうどで踏み越えは25点にリセットされる', () => {
      const result = applyFaultRule(50, 'STEP_OVER')
      expect(result).toBe(25)
    })

    it('36点以下のとき踏み越えはスコアが変わらない（0点ミスとして処理済み）', () => {
      const result = applyFaultRule(36, 'STEP_OVER')
      expect(result).toBe(36)
    })

    it('0点のとき踏み越えはスコアが変わらない', () => {
      const result = applyFaultRule(0, 'STEP_OVER')
      expect(result).toBe(0)
    })
  })

  describe('その他のフォルト', () => {
    it('MISSフォルトはスコアを変更しない', () => {
      const result = applyFaultRule(30, 'MISS')
      expect(result).toBe(30)
    })

    it('DROPフォルトはスコアを変更しない', () => {
      const result = applyFaultRule(30, 'DROP')
      expect(result).toBe(30)
    })

    it('WRONG_ORDERフォルトはスコアを変更しない', () => {
      const result = applyFaultRule(30, 'WRONG_ORDER')
      expect(result).toBe(30)
    })

    it('フォルトなし（null）はスコアを変更しない', () => {
      const result = applyFaultRule(30, null)
      expect(result).toBe(30)
    })
  })
})

// ============================================================
// processThrow（統合テスト）
// ============================================================
describe('processThrow', () => {
  it('通常の1本倒しが正しく処理される', () => {
    const result = processThrow({
      currentScore: 20,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [7], faultType: null },
    })
    expect(result.score).toBe(7)
    expect(result.totalScore).toBe(27)
    expect(result.consecutiveMisses).toBe(0)
    expect(result.isDisqualified).toBe(false)
    expect(result.isWinner).toBe(false)
    expect(result.isFault).toBe(false)
    expect(result.faultType).toBe(null)
  })

  it('複数本倒しが正しく処理される', () => {
    const result = processThrow({
      currentScore: 10,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [1, 2, 3], faultType: null },
    })
    expect(result.score).toBe(3)
    expect(result.totalScore).toBe(13)
  })

  it('ちょうど50点で勝利する', () => {
    const result = processThrow({
      currentScore: 43,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [7], faultType: null },
    })
    expect(result.totalScore).toBe(50)
    expect(result.isWinner).toBe(true)
  })

  it('50点を超えると25点にリセットされる', () => {
    const result = processThrow({
      currentScore: 48,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [5], faultType: null },
    })
    expect(result.totalScore).toBe(25)
    expect(result.isWinner).toBe(false)
  })

  it('0本で連続ミスが増える', () => {
    const result = processThrow({
      currentScore: 20,
      consecutiveMisses: 1,
      throwInput: { skittlesKnocked: [], faultType: null },
    })
    expect(result.score).toBe(0)
    expect(result.totalScore).toBe(20)
    expect(result.consecutiveMisses).toBe(2)
    expect(result.isDisqualified).toBe(false)
  })

  it('3回連続ミスで失格になる', () => {
    const result = processThrow({
      currentScore: 20,
      consecutiveMisses: 2,
      throwInput: { skittlesKnocked: [], faultType: null },
    })
    expect(result.consecutiveMisses).toBe(3)
    expect(result.isDisqualified).toBe(true)
  })

  it('得点が入ると連続ミスがリセットされる', () => {
    const result = processThrow({
      currentScore: 20,
      consecutiveMisses: 2,
      throwInput: { skittlesKnocked: [5], faultType: null },
    })
    expect(result.consecutiveMisses).toBe(0)
    expect(result.isDisqualified).toBe(false)
  })

  it('37点以上でSTEP_OVERフォルトは25点にリセットされる', () => {
    const result = processThrow({
      currentScore: 40,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [], faultType: 'STEP_OVER' },
    })
    expect(result.totalScore).toBe(25)
    expect(result.isFault).toBe(true)
    expect(result.faultType).toBe('STEP_OVER')
  })

  it('37点未満でSTEP_OVERフォルトはスコアが変わらない', () => {
    const result = processThrow({
      currentScore: 36,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [], faultType: 'STEP_OVER' },
    })
    expect(result.totalScore).toBe(36)
    expect(result.isFault).toBe(true)
  })

  it('MISSフォルトは0点でスコア変わらず連続ミスが増える', () => {
    const result = processThrow({
      currentScore: 30,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [], faultType: 'MISS' },
    })
    expect(result.score).toBe(0)
    expect(result.totalScore).toBe(30)
    expect(result.consecutiveMisses).toBe(1)
    expect(result.isFault).toBe(true)
  })

  it('フォルトがあってもオーバースコアの25点リセットは適用されない', () => {
    // STEP_OVERで37点以上→25点リセットが優先される
    const result = processThrow({
      currentScore: 48,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [], faultType: 'STEP_OVER' },
    })
    expect(result.totalScore).toBe(25)
  })

  it('オーバースコアリセット後は勝者にならない', () => {
    const result = processThrow({
      currentScore: 48,
      consecutiveMisses: 0,
      throwInput: { skittlesKnocked: [5], faultType: null },
    })
    expect(result.isWinner).toBe(false)
    expect(result.totalScore).toBe(25)
  })
})

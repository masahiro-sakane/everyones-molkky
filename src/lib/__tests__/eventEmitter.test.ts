import { describe, it, expect, vi, beforeEach } from 'vitest'
import { matchEmitter } from '../eventEmitter'

describe('eventEmitter', () => {
  beforeEach(() => {
    // リスナーをすべてリセット（テスト間の干渉防止）
    // グローバルシングルトンなので、テスト後にアンサブスクライブが必要
  })

  it('イベントを発行するとリスナーが呼ばれる', () => {
    const listener = vi.fn()
    const unsub = matchEmitter.subscribe('match-1', listener)

    matchEmitter.emit({
      type: 'scoreUpdated',
      shareCode: 'match-1',
      payload: { score: 5 },
    })

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'scoreUpdated', shareCode: 'match-1' })
    )
    unsub()
  })

  it('異なる shareCode のリスナーには届かない', () => {
    const listenerA = vi.fn()
    const listenerB = vi.fn()
    const unsubA = matchEmitter.subscribe('match-A', listenerA)
    const unsubB = matchEmitter.subscribe('match-B', listenerB)

    matchEmitter.emit({ type: 'scoreUpdated', shareCode: 'match-A', payload: {} })

    expect(listenerA).toHaveBeenCalledOnce()
    expect(listenerB).not.toHaveBeenCalled()

    unsubA()
    unsubB()
  })

  it('アンサブスクライブ後はイベントが届かない', () => {
    const listener = vi.fn()
    const unsub = matchEmitter.subscribe('match-2', listener)

    matchEmitter.emit({ type: 'ping', shareCode: 'match-2', payload: {} })
    expect(listener).toHaveBeenCalledOnce()

    unsub()
    matchEmitter.emit({ type: 'ping', shareCode: 'match-2', payload: {} })
    expect(listener).toHaveBeenCalledOnce() // まだ1回のまま
  })

  it('複数リスナーが同一 shareCode でイベントを受け取る', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    const unsub1 = matchEmitter.subscribe('match-3', listener1)
    const unsub2 = matchEmitter.subscribe('match-3', listener2)

    matchEmitter.emit({ type: 'matchFinished', shareCode: 'match-3', payload: {} })

    expect(listener1).toHaveBeenCalledOnce()
    expect(listener2).toHaveBeenCalledOnce()

    unsub1()
    unsub2()
  })

  it('listenerCount が正しいカウントを返す', () => {
    const unsub1 = matchEmitter.subscribe('match-4', vi.fn())
    const unsub2 = matchEmitter.subscribe('match-4', vi.fn())

    expect(matchEmitter.listenerCount('match-4')).toBe(2)

    unsub1()
    expect(matchEmitter.listenerCount('match-4')).toBe(1)

    unsub2()
    expect(matchEmitter.listenerCount('match-4')).toBe(0)
  })

  it('リスナーがエラーを投げても他のリスナーに影響しない', () => {
    const badListener = vi.fn(() => { throw new Error('listener error') })
    const goodListener = vi.fn()
    const unsub1 = matchEmitter.subscribe('match-5', badListener)
    const unsub2 = matchEmitter.subscribe('match-5', goodListener)

    expect(() => {
      matchEmitter.emit({ type: 'ping', shareCode: 'match-5', payload: {} })
    }).not.toThrow()

    expect(goodListener).toHaveBeenCalledOnce()

    unsub1()
    unsub2()
  })
})

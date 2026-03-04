import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealtimeScore } from '../useRealtimeScore'

// EventSource モッククラス
class MockEventSource {
  static instances: MockEventSource[] = []

  url: string
  readyState = 0
  private handlers: Record<string, Array<(e: Event | MessageEvent) => void>> = {}
  onerror: ((e: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: (e: Event | MessageEvent) => void) {
    if (!this.handlers[type]) this.handlers[type] = []
    this.handlers[type].push(handler)
  }

  simulateEvent(type: string, data?: unknown) {
    if (type === 'error') {
      const ev = new Event('error')
      this.handlers['error']?.forEach((h) => h(ev))
      if (this.onerror) this.onerror(ev)
    } else {
      const ev = new MessageEvent(type, {
        data: JSON.stringify(data ?? {}),
      })
      this.handlers[type]?.forEach((h) => h(ev))
    }
  }

  close() {
    this.readyState = 2
  }
}

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: { status: 'IN_PROGRESS' } }),
})

describe('useRealtimeScore', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    // EventSource をグローバルに登録してフックが SSE パスを使うようにする
    vi.stubGlobal('EventSource', MockEventSource)
    vi.stubGlobal('fetch', mockFetch)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('初期状態は connecting', () => {
    const { result } = renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123' })
    )
    expect(result.current.status).toBe('connecting')
    expect(MockEventSource.instances).toHaveLength(1)
  })

  it('connected イベントで status が connected になる', () => {
    const { result } = renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123' })
    )

    act(() => {
      MockEventSource.instances[0].simulateEvent('connected', { shareCode: 'abc123' })
    })

    expect(result.current.status).toBe('connected')
  })

  it('lastEventAt が connected イベントで更新される', () => {
    const { result } = renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123' })
    )

    expect(result.current.lastEventAt).toBeNull()

    act(() => {
      MockEventSource.instances[0].simulateEvent('connected', {})
    })

    expect(result.current.lastEventAt).not.toBeNull()
  })

  it('scoreUpdated イベントで onEvent が呼ばれる', () => {
    const onEvent = vi.fn()
    renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123', onEvent })
    )

    act(() => {
      MockEventSource.instances[0].simulateEvent('connected', {})
      MockEventSource.instances[0].simulateEvent('scoreUpdated', { score: 5 })
    })

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'scoreUpdated', shareCode: 'abc123' })
    )
  })

  it('matchFinished イベントで onEvent が呼ばれる', () => {
    const onEvent = vi.fn()
    renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123', onEvent })
    )

    act(() => {
      MockEventSource.instances[0].simulateEvent('matchFinished', { isWinner: true })
    })

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'matchFinished' })
    )
  })

  it('error で status が disconnected になり再接続をスケジュールする', () => {
    const { result } = renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123' })
    )

    act(() => {
      MockEventSource.instances[0].simulateEvent('error')
    })

    expect(result.current.status).toBe('disconnected')

    // タイマーを進めると再接続 (2つ目のEventSourceが作られる)
    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(MockEventSource.instances).toHaveLength(2)
  })

  it('再接続中は status が reconnecting になる', () => {
    const { result } = renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123' })
    )

    // 1回エラー → 再接続 → 2つ目のEventSourceができる
    act(() => {
      MockEventSource.instances[0].simulateEvent('error')
    })
    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(result.current.status).toBe('reconnecting')
  })

  it('アンマウント時に EventSource が閉じられる', () => {
    const { unmount } = renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123' })
    )

    const es = MockEventSource.instances[0]
    expect(es).toBeDefined()

    unmount()

    expect(es.readyState).toBe(2) // CLOSED
  })

  it('3回失敗後はポーリングにフォールバックする', async () => {
    renderHook(() =>
      useRealtimeScore({ shareCode: 'abc123', pollingIntervalMs: 1000 })
    )

    // 3回エラー → 再接続を繰り返す
    for (let i = 0; i < 3; i++) {
      act(() => {
        MockEventSource.instances.at(-1)!.simulateEvent('error')
      })
      act(() => {
        vi.advanceTimersByTime(1000 * 2 ** i + 100)
      })
    }

    // ポーリング開始で fetch が呼ばれる
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/matches/abc123`,
      expect.objectContaining({ cache: 'no-store' })
    )
  })

  it('shareCode が正しい SSE URL に使われる', () => {
    renderHook(() =>
      useRealtimeScore({ shareCode: 'xyz789' })
    )

    expect(MockEventSource.instances[0].url).toBe('/api/matches/xyz789/stream')
  })
})

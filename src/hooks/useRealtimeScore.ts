'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export type RealtimeScoreEvent = {
  type: 'scoreUpdated' | 'matchFinished' | 'ping' | 'connected'
  shareCode: string
  payload?: Record<string, unknown>
  timestamp?: number
}

type UseRealtimeScoreOptions = {
  shareCode: string
  onEvent?: (event: RealtimeScoreEvent) => void
  /** SSE が使えない場合のポーリング間隔(ms)。0 で無効 */
  pollingIntervalMs?: number
  /** SSE 再接続の最大待機時間(ms) */
  maxReconnectDelayMs?: number
}

function isSseSupported(): boolean {
  return typeof EventSource !== 'undefined'
}

export function useRealtimeScore({
  shareCode,
  onEvent,
  pollingIntervalMs = 5_000,
  maxReconnectDelayMs = 30_000,
}: UseRealtimeScoreOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)

  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const closeEventSource = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    clearReconnectTimer()
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }, [])

  // Polling フォールバック（SSE 非対応 or 接続失敗時）
  const startPolling = useCallback(() => {
    if (!pollingIntervalMs || pollingTimerRef.current) return

    const fetchLatest = async () => {
      try {
        const res = await fetch(`/api/matches/${shareCode}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setLastEventAt(Date.now())
        onEventRef.current?.({
          type: 'scoreUpdated',
          shareCode,
          payload: data.data,
          timestamp: Date.now(),
        })
      } catch {
        // ネットワークエラーは無視
      }
    }

    fetchLatest()
    pollingTimerRef.current = setInterval(fetchLatest, pollingIntervalMs)
    setStatus('connected')
  }, [shareCode, pollingIntervalMs])

  // SSE 接続
  const connectSSE = useCallback(() => {
    if (!isSseSupported()) {
      startPolling()
      return
    }

    closeEventSource()
    setStatus(reconnectAttemptsRef.current === 0 ? 'connecting' : 'reconnecting')

    const url = `/api/matches/${shareCode}/stream`
    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('connected', () => {
      reconnectAttemptsRef.current = 0
      setStatus('connected')
      setLastEventAt(Date.now())
      stopPolling()
    })

    es.addEventListener('scoreUpdated', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as Record<string, unknown>
        setLastEventAt(Date.now())
        onEventRef.current?.({ type: 'scoreUpdated', shareCode, payload })
      } catch {
        // JSON パースエラーは無視
      }
    })

    es.addEventListener('matchFinished', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as Record<string, unknown>
        setLastEventAt(Date.now())
        onEventRef.current?.({ type: 'matchFinished', shareCode, payload })
      } catch {
        // JSON パースエラーは無視
      }
    })

    es.addEventListener('ping', () => {
      setLastEventAt(Date.now())
    })

    es.onerror = () => {
      es.close()
      esRef.current = null
      setStatus('disconnected')

      // 指数バックオフで再接続（最大 maxReconnectDelayMs）
      const attempts = reconnectAttemptsRef.current
      const delay = Math.min(1_000 * 2 ** attempts, maxReconnectDelayMs)
      reconnectAttemptsRef.current = attempts + 1

      reconnectTimerRef.current = setTimeout(() => {
        // SSE が3回失敗したらポーリングにフォールバック
        if (reconnectAttemptsRef.current >= 3) {
          startPolling()
        } else {
          connectSSE()
        }
      }, delay)
    }
  }, [shareCode, closeEventSource, stopPolling, startPolling, maxReconnectDelayMs])

  useEffect(() => {
    connectSSE()
    return () => {
      closeEventSource()
      stopPolling()
    }
  }, [connectSSE, closeEventSource, stopPolling])

  return { status, lastEventAt }
}

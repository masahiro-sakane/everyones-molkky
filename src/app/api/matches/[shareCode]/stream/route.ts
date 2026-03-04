import { type NextRequest } from 'next/server'
import { matchEmitter, type MatchEvent } from '@/lib/eventEmitter'
import { getMatchByShareCode } from '@/services/matchService'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ shareCode: string }> }

// SSE フォーマットヘルパー
function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest, { params }: Params) {
  const { shareCode } = await params

  // 試合の存在確認
  const match = await getMatchByShareCode(shareCode)
  if (!match) {
    return new Response('試合が見つかりません', { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // 接続確立時に現在のスコアを送信
      const initialData = {
        shareCode,
        status: match.status,
        timestamp: Date.now(),
      }
      controller.enqueue(
        encoder.encode(sseMessage('connected', initialData))
      )

      // PubSub に登録
      const unsubscribe = matchEmitter.subscribe(shareCode, (event: MatchEvent) => {
        try {
          controller.enqueue(
            encoder.encode(sseMessage(event.type, { ...event.payload, shareCode }))
          )
        } catch {
          // クライアントが切断済みの場合は無視
        }
      })

      // Ping タイマー（30秒ごと、接続維持）
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(sseMessage('ping', { timestamp: Date.now() }))
          )
        } catch {
          clearInterval(pingInterval)
        }
      }, 30_000)

      // クライアント切断時のクリーンアップ
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // すでに閉じている場合は無視
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx バッファリング無効化
    },
  })
}

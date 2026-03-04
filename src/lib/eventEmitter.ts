/**
 * インメモリ PubSub — SSE ブロードキャスト用
 * Next.js の開発サーバーはホットリロードで再起動するため
 * globalThis にシングルトンとして保持する。
 */

export type MatchEvent =
  | { type: 'scoreUpdated'; shareCode: string; payload: Record<string, unknown> }
  | { type: 'matchFinished'; shareCode: string; payload: Record<string, unknown> }
  | { type: 'ping'; shareCode: string; payload: Record<string, unknown> }

type Listener = (event: MatchEvent) => void

class EventEmitter {
  private listeners = new Map<string, Set<Listener>>()

  subscribe(shareCode: string, listener: Listener): () => void {
    if (!this.listeners.has(shareCode)) {
      this.listeners.set(shareCode, new Set())
    }
    this.listeners.get(shareCode)!.add(listener)

    // アンサブスクライブ関数を返す
    return () => {
      const set = this.listeners.get(shareCode)
      if (set) {
        set.delete(listener)
        if (set.size === 0) {
          this.listeners.delete(shareCode)
        }
      }
    }
  }

  emit(event: MatchEvent): void {
    const set = this.listeners.get(event.shareCode)
    if (!set) return
    for (const listener of set) {
      try {
        listener(event)
      } catch {
        // リスナーのエラーが他のリスナーに影響しないようにする
      }
    }
  }

  listenerCount(shareCode: string): number {
    return this.listeners.get(shareCode)?.size ?? 0
  }
}

// グローバルシングルトン（開発時のホットリロード対策）
const globalForEmitter = globalThis as unknown as {
  matchEmitter: EventEmitter | undefined
}

export const matchEmitter: EventEmitter =
  globalForEmitter.matchEmitter ?? new EventEmitter()

if (process.env.NODE_ENV !== 'production') {
  globalForEmitter.matchEmitter = matchEmitter
}

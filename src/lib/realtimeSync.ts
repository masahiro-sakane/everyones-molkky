import type { MatchData } from '@/hooks/useMatch'
import { toMatchData } from './matchDataMapper'

/**
 * SSE イベント受信時に最新の試合データを取得し、楽観的更新と競合しなければ同期する。
 *
 * 競合防止の要点:
 * - fetch 開始前に「自分の投擲が処理中(isPending)」ならスキップする。
 *   自分の投擲は POST レスポンスの match で同期されるため、ここでの再取得は不要。
 * - fetch 完了後にも再度 isPending を確認する。fetch 中に自分の投擲が始まった場合、
 *   取得済みデータは既に古く、そのまま適用すると進行中の楽観的更新を踏み潰して
 *   「古い記録が表示される」不具合になるため破棄する。
 *
 * @returns 同期に使うべき MatchData。スキップ/失敗時は null。
 */
export async function fetchLatestForSync(params: {
  shareCode: string
  /** 呼び出し時点で自分の投擲が処理中か（最新値を返す関数） */
  isPending: () => boolean
  /** fetch 実装（テスト差し替え用、既定は global fetch） */
  fetchImpl?: typeof fetch
}): Promise<MatchData | null> {
  const { shareCode, isPending, fetchImpl = fetch } = params

  // fetch 前ガード: 自分の投擲処理中はスキップ
  if (isPending()) return null

  try {
    const res = await fetchImpl(`/api/matches/${shareCode}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.data) return null

    // fetch 後ガード: 完了までに自分の投擲が始まっていたら破棄
    if (isPending()) return null

    return toMatchData(json.data)
  } catch {
    // ネットワークエラーは無視（次のSSE/ポーリングで回復）
    return null
  }
}

import { describe, it, expect, vi } from 'vitest'
import { fetchLatestForSync } from '../realtimeSync'

/**
 * SSE 再取得と楽観的更新の競合防止テスト
 *
 * バグ: ミスを複数回記録すると、他チームの投擲SSEによる再fetchが
 * 自分の次の投擲の楽観的更新を「古い記録」で上書きしてしまう。
 * 原因は fetch 完了時に isPending を再チェックしていなかったこと。
 */

const rawMatch = (id: string) => ({
  id,
  shareCode: 'abc123',
  status: 'IN_PROGRESS',
  matchType: 'TEAM',
  limitType: 'NONE',
  totalSets: 1,
  matchTeams: [],
  sets: [],
})

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response
}

describe('fetchLatestForSync', () => {
  it('isPending でない場合は最新データを返す', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: rawMatch('fresh') }))
    const result = await fetchLatestForSync({
      shareCode: 'abc123',
      isPending: () => false,
      fetchImpl,
    })
    expect(result?.id).toBe('fresh')
    expect(fetchImpl).toHaveBeenCalledWith('/api/matches/abc123', { cache: 'no-store' })
  })

  it('fetch 開始前に isPending なら fetch せず null を返す', async () => {
    const fetchImpl = vi.fn()
    const result = await fetchLatestForSync({
      shareCode: 'abc123',
      isPending: () => true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fetch 中に isPending に変わったら（自分の投擲が始まったら）破棄して null を返す', async () => {
    // 競合の再現: fetch 開始時は isPending=false、fetch 完了時は isPending=true
    let pending = false
    const fetchImpl = vi.fn().mockImplementation(async () => {
      // この fetch の最中に自分の投擲が始まったと仮定
      pending = true
      return jsonResponse({ data: rawMatch('stale') })
    })

    const result = await fetchLatestForSync({
      shareCode: 'abc123',
      isPending: () => pending,
      fetchImpl,
    })

    // 古いデータ（stale）で上書きせず破棄する
    expect(result).toBeNull()
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('レスポンスが ok でない場合は null を返す', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: rawMatch('x') }, false))
    const result = await fetchLatestForSync({
      shareCode: 'abc123',
      isPending: () => false,
      fetchImpl,
    })
    expect(result).toBeNull()
  })

  it('data フィールドが無い場合は null を返す', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}))
    const result = await fetchLatestForSync({
      shareCode: 'abc123',
      isPending: () => false,
      fetchImpl,
    })
    expect(result).toBeNull()
  })

  it('fetch が例外を投げても null を返す（クラッシュしない）', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'))
    const result = await fetchLatestForSync({
      shareCode: 'abc123',
      isPending: () => false,
      fetchImpl,
    })
    expect(result).toBeNull()
  })
})

'use client'

import { useCallback, useState } from 'react'
import type { MatchData } from './useMatch'
import { calculateThrowScore } from '@/lib/scoring'

export type PendingThrow = {
  teamId: string
  userId: string
  skittlesKnocked: number[]
  faultType: string | null
}

/**
 * 楽観的更新用フック
 * 投擲確定時に即座に match データへ仮の throw を差し込み、
 * useScoreSheet がリアルタイムに再計算できるようにする
 */
export function useOptimisticMatch(match: MatchData) {
  const [optimisticMatch, setOptimisticMatch] = useState<MatchData>(match)
  const [isPending, setIsPending] = useState(false)

  // サーバーからの最新データで同期（router.refresh() 後に呼ばれる）
  const syncFromServer = useCallback((fresh: MatchData) => {
    setOptimisticMatch(fresh)
    setIsPending(false)
  }, [])

  // 投擲を楽観的に適用する
  const applyOptimistic = useCallback(
    (pending: PendingThrow) => {
      setIsPending(true)
      setOptimisticMatch((prev) => {
        const currentSet = prev.sets.find((s) => s.status === 'IN_PROGRESS') ?? prev.sets.at(-1)
        if (!currentSet) return prev

        // 投擲待ちのターン = throws が空の末尾ターン
        // DB上は常に空ターンが先に作られる
        const activeTurn = currentSet.turns.at(-1)
        if (!activeTurn) return prev

        const score = calculateThrowScore(pending.skittlesKnocked)

        const optimisticThrow = {
          id: `optimistic-${Date.now()}`,
          teamId: pending.teamId,
          userId: pending.userId,
          throwOrder: 1,
          skittlesKnocked: pending.skittlesKnocked,
          score: pending.faultType ? 0 : score,
          isFault: pending.faultType !== null,
          faultType: pending.faultType,
          createdAt: new Date().toISOString(),
          user: null,
        }

        // 現在の空ターンに投擲を追加するだけ
        // 次のターン作成はサーバーに任せる（currentThrower の計算はサーバーデータで行う）
        const updatedSets = prev.sets.map((set) => {
          if (set.id !== currentSet.id) return set
          const updatedTurns = set.turns.map((turn) => {
            if (turn.id !== activeTurn.id) return turn
            return { ...turn, throws: [optimisticThrow] }
          })
          return { ...set, turns: updatedTurns }
        })

        return { ...prev, sets: updatedSets }
      })
    },
    []
  )

  // ロールバック（エラー時）
  const rollback = useCallback((original: MatchData) => {
    setOptimisticMatch(original)
    setIsPending(false)
  }, [])

  return { optimisticMatch, isPending, applyOptimistic, syncFromServer, rollback }
}

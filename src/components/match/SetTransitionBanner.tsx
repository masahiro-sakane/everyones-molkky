'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type SetTransitionInfo = {
  completedSetNumber: number
  totalSets: number
  winnerId: string | null
  winnerName: string | null
  remainingSets: number
}

type SetTransitionBannerProps = {
  shareCode: string
  info: SetTransitionInfo
  watchMode?: boolean
}

export function SetTransitionBanner({ shareCode, info, watchMode = false }: SetTransitionBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNextSet = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/matches/${shareCode}/next-set`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '次のゲームの開始に失敗しました')
      }
    } catch {
      setError('次のゲームの開始に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-5 text-center flex flex-col items-center gap-4">
      <div>
        <p className="text-xs text-brand-600 font-medium mb-1">
          ゲーム {info.completedSetNumber} 終了
        </p>
        {info.winnerName ? (
          <p className="text-base font-bold text-neutral-900">
            {info.winnerName} の勝利！
          </p>
        ) : (
          <p className="text-base font-bold text-neutral-900">引き分け</p>
        )}
        <p className="text-xs text-neutral-500 mt-1">
          残り {info.remainingSets} ゲーム（全 {info.totalSets} ゲーム中）
        </p>
      </div>

      {!watchMode && (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="primary"
            isLoading={isLoading}
            onClick={handleNextSet}
          >
            次のゲームへ
          </Button>
          <p className="text-xs text-neutral-400">
            投擲順とプレイヤー順が逆順になります
          </p>
        </div>
      )}

      {watchMode && (
        <p className="text-xs text-neutral-500">次のゲームが始まるまでお待ちください</p>
      )}

      {error && (
        <p className="text-xs text-danger-600" role="alert">{error}</p>
      )}
    </div>
  )
}

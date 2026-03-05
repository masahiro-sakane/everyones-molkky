'use client'

import { useEffect, useState } from 'react'

type Props = {
  limitType: 'NONE' | 'TURNS' | 'TIME'
  turnLimit: number | null
  timeLimitMinutes: number | null
  startedAt: Date | string | null
  remainingRounds: number | null
  currentRound: number
}

export function MatchLimitStatus({
  limitType,
  turnLimit,
  timeLimitMinutes,
  startedAt,
  remainingRounds,
  currentRound,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (limitType !== 'TIME' || !startedAt) return

    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      setElapsedSeconds(elapsed)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [limitType, startedAt])

  if (limitType === 'NONE') return null

  if (limitType === 'TURNS' && turnLimit !== null) {
    const isWarning = (remainingRounds ?? 0) <= 3
    return (
      <div
        className={[
          'flex items-center justify-between px-3 py-2 rounded-md border text-sm',
          isWarning
            ? 'border-warning-300 bg-warning-50 text-warning-700'
            : 'border-neutral-200 bg-neutral-50 text-neutral-600',
        ].join(' ')}
        aria-label="ターン制限状況"
      >
        <span>ラウンド</span>
        <span className="font-bold tabular-nums">
          {currentRound} / {turnLimit}
          {remainingRounds !== null && remainingRounds > 0 && (
            <span className="ml-1 text-xs font-normal">（残り {remainingRounds} ラウンド）</span>
          )}
          {remainingRounds === 0 && (
            <span className="ml-1 text-xs font-normal">（最終ラウンド）</span>
          )}
        </span>
      </div>
    )
  }

  if (limitType === 'TIME' && timeLimitMinutes !== null) {
    const totalSeconds = timeLimitMinutes * 60
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)
    const remainingMinutes = Math.floor(remainingSeconds / 60)
    const remainingSecondsDisplay = remainingSeconds % 60
    const isWarning = remainingSeconds <= 180 // 残り3分
    const isOver = remainingSeconds === 0

    return (
      <div
        className={[
          'flex items-center justify-between px-3 py-2 rounded-md border text-sm',
          isOver
            ? 'border-danger-300 bg-danger-50 text-danger-700'
            : isWarning
              ? 'border-warning-300 bg-warning-50 text-warning-700'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600',
        ].join(' ')}
        aria-label="時間制限状況"
        aria-live="polite"
      >
        <span>{isOver ? '時間終了（ラウンド終了で決定）' : '残り時間'}</span>
        {!isOver && (
          <span className="font-bold tabular-nums text-base">
            {String(remainingMinutes).padStart(2, '0')}:{String(remainingSecondsDisplay).padStart(2, '0')}
          </span>
        )}
      </div>
    )
  }

  return null
}

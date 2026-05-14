'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ScoreInputPanel } from './ScoreInputPanel'
import type { PendingThrow } from '@/hooks/useOptimisticMatch'

type FaultType = 'MISS' | 'DROP' | 'STEP_OVER' | 'WRONG_ORDER'

type ThrowRecorderProps = {
  shareCode: string
  currentTeamId: string
  currentUserId: string
  isFirstThrow?: boolean
  disabled?: boolean
  consecutiveMisses?: number
  onOptimisticThrow: (pending: PendingThrow) => Promise<void>
  isPending?: boolean
}

const FAULT_LABELS: Record<FaultType, string> = {
  MISS: 'ミス（0本）',
  DROP: 'ドロップ',
  STEP_OVER: '踏み越え',
  WRONG_ORDER: '順番違い',
}

export function ThrowRecorder({
  currentTeamId,
  currentUserId,
  isFirstThrow = false,
  disabled = false,
  consecutiveMisses = 0,
  onOptimisticThrow,
  isPending = false,
}: ThrowRecorderProps) {
  const [faultOpen, setFaultOpen] = useState(false)
  const [selectedFault, setSelectedFault] = useState<FaultType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isDisabled = disabled || isPending

  const handleScoreConfirm = async (knocked: number[]) => {
    setError(null)
    try {
      await onOptimisticThrow({
        teamId: currentTeamId,
        userId: currentUserId,
        skittlesKnocked: knocked,
        faultType: null,
      })
    } catch {
      setError('投擲の記録に失敗しました')
    }
  }

  const handleMiss = async () => {
    setError(null)
    try {
      await onOptimisticThrow({
        teamId: currentTeamId,
        userId: currentUserId,
        skittlesKnocked: [],
        faultType: null,
      })
    } catch {
      setError('投擲の記録に失敗しました')
    }
  }

  const handleFaultSubmit = async () => {
    if (!selectedFault) return
    setError(null)
    try {
      await onOptimisticThrow({
        teamId: currentTeamId,
        userId: currentUserId,
        skittlesKnocked: [],
        faultType: selectedFault,
      })
      setSelectedFault(null)
      setFaultOpen(false)
    } catch {
      setError('投擲の記録に失敗しました')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 2連続ミス警告 */}
      {consecutiveMisses >= 2 && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-md bg-warning-50 border border-warning-300"
        >
          <div>
            <p className="text-sm font-bold text-warning-700">連続ミス {consecutiveMisses}/3 — 失格注意</p>
            <p className="text-xs text-warning-600 mt-0.5">次にミスすると失格になります</p>
          </div>
        </div>
      )}

      {/* 得点入力（常時表示） */}
      <ScoreInputPanel
        isFirstThrow={isFirstThrow}
        onConfirm={handleScoreConfirm}
        onMiss={handleMiss}
        disabled={isDisabled}
        isLoading={isPending}
        onFaultOpen={() => setFaultOpen(true)}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-600">{error}</p>
      )}

      {/* フォルト入力シート */}
      {faultOpen && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-neutral-900/40 rounded-lg">
          <div className="bg-neutral-0 rounded-t-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-neutral-800">フォルト種別を選択</span>
              <button
                type="button"
                onClick={() => { setFaultOpen(false); setSelectedFault(null) }}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FAULT_LABELS) as FaultType[]).map((fault) => (
                <button
                  key={fault}
                  type="button"
                  onClick={() => setSelectedFault(fault)}
                  disabled={isDisabled}
                  className={[
                    'px-3 py-2.5 rounded-md border text-sm font-medium transition-colors text-left',
                    selectedFault === fault
                      ? 'border-danger-500 bg-danger-50 text-danger-700'
                      : 'border-neutral-300 bg-neutral-0 text-neutral-700 hover:border-neutral-400',
                  ].join(' ')}
                  aria-pressed={selectedFault === fault}
                >
                  {FAULT_LABELS[fault]}
                </button>
              ))}
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger-600">{error}</p>
            )}
            <Button
              type="button"
              variant="danger"
              isLoading={isPending}
              disabled={!selectedFault || isDisabled}
              onClick={handleFaultSubmit}
              data-testid="record-fault"
            >
              フォルトを記録
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

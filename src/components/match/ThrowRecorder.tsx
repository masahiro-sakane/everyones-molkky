'use client'

import { useState, useRef } from 'react'
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
  const [mode, setMode] = useState<'score' | 'fault'>('score')
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
    } catch {
      setError('投擲の記録に失敗しました')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 2連続ミス警告 */}
      {consecutiveMisses >= 2 && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-warning-50 border border-warning-300"
        >
          <div>
            <p className="text-sm font-bold text-warning-700">連続ミス {consecutiveMisses}/3 — 失格注意</p>
            <p className="text-xs text-warning-600 mt-0.5">次にミスすると失格になります</p>
          </div>
        </div>
      )}

      {/* モード切り替え */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-md">
        <button
          type="button"
          onClick={() => setMode('score')}
          disabled={isDisabled}
          data-testid="mode-score"
          className={[
            'flex-1 py-1.5 text-sm font-medium rounded transition-colors',
            mode === 'score'
              ? 'bg-neutral-0 text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          得点入力
        </button>
        <button
          type="button"
          onClick={() => setMode('fault')}
          disabled={isDisabled}
          data-testid="mode-fault"
          className={[
            'flex-1 py-1.5 text-sm font-medium rounded transition-colors',
            mode === 'fault'
              ? 'bg-neutral-0 text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          フォルト
        </button>
      </div>

      {mode === 'score' ? (
        <div>
          <ScoreInputPanel
            isFirstThrow={isFirstThrow}
            onConfirm={handleScoreConfirm}
            onMiss={handleMiss}
            disabled={isDisabled}
            isLoading={isPending}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger-600">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
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
      )}
    </div>
  )
}

'use client'

import { useActionState, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { SkittleInput } from './SkittleInput'
import { recordThrowAction, type MatchActionState } from '@/app/actions/match'

type FaultType = 'MISS' | 'DROP' | 'STEP_OVER' | 'WRONG_ORDER'

type ThrowRecorderProps = {
  shareCode: string
  currentTeamId: string
  currentUserId: string
  disabled?: boolean
}

const initialState: MatchActionState = {}

const FAULT_LABELS: Record<FaultType, string> = {
  MISS: 'ミス（0本）',
  DROP: 'ドロップ',
  STEP_OVER: '踏み越え',
  WRONG_ORDER: '順番違い',
}

export function ThrowRecorder({
  shareCode,
  currentTeamId,
  currentUserId,
  disabled = false,
}: ThrowRecorderProps) {
  const boundAction = recordThrowAction.bind(null, shareCode)
  const [state, action, isPending] = useActionState(boundAction, initialState)

  const [mode, setMode] = useState<'skittle' | 'fault'>('skittle')
  const [selectedSkittles, setSelectedSkittles] = useState<number[]>([])
  const [selectedFault, setSelectedFault] = useState<FaultType | null>(null)
  const skittleFormRef = useRef<HTMLFormElement>(null)

  const handleSkittleConfirm = (knocked: number[]) => {
    setSelectedSkittles(knocked)
    // state 更新は非同期のため、hidden input の value を直接書き換えてから submit する
    const form = skittleFormRef.current
    if (!form) return
    const input = form.querySelector<HTMLInputElement>('input[name="skittlesKnocked"]')
    if (input) input.value = JSON.stringify(knocked)
    form.requestSubmit()
  }

  const isReady =
    mode === 'skittle'
      ? true
      : selectedFault !== null

  return (
    <div className="flex flex-col gap-4">
      {/* モード切り替え */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-md">
        <button
          type="button"
          onClick={() => setMode('skittle')}
          disabled={disabled || isPending}
          data-testid="mode-skittle"
          className={[
            'flex-1 py-1.5 text-sm font-medium rounded transition-colors',
            mode === 'skittle'
              ? 'bg-neutral-0 text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          スキットル
        </button>
        <button
          type="button"
          onClick={() => setMode('fault')}
          disabled={disabled || isPending}
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

      {mode === 'skittle' ? (
        <form action={action} ref={skittleFormRef}>
          <input type="hidden" name="userId" value={currentUserId} />
          <input type="hidden" name="teamId" value={currentTeamId} />
          <input
            type="hidden"
            name="skittlesKnocked"
            value={JSON.stringify(selectedSkittles)}
          />

          <SkittleInput
            onConfirm={handleSkittleConfirm}
            disabled={disabled || isPending}
            isLoading={isPending}
          />

          {state.message && (
            <p role="alert" className="mt-2 text-sm text-danger-600">
              {state.message}
            </p>
          )}
        </form>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="userId" value={currentUserId} />
          <input type="hidden" name="teamId" value={currentTeamId} />
          <input type="hidden" name="skittlesKnocked" value="[]" />
          {selectedFault && (
            <input type="hidden" name="faultType" value={selectedFault} />
          )}

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FAULT_LABELS) as FaultType[]).map((fault) => (
              <button
                key={fault}
                type="button"
                onClick={() => setSelectedFault(fault)}
                disabled={disabled || isPending}
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

          {state.message && (
            <p role="alert" className="text-sm text-danger-600">
              {state.message}
            </p>
          )}

          <Button
            type="submit"
            variant="danger"
            isLoading={isPending}
            disabled={!selectedFault || disabled}
            data-testid="record-fault"
          >
            フォルトを記録
          </Button>
        </form>
      )}
    </div>
  )
}

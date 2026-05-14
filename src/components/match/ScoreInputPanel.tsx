'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export type InputMode = 'single' | 'multi'

type ScoreInputPanelProps = {
  /** 試合の最初の投擲か（true なら複数本モード、false なら 1本モードを初期値に） */
  isFirstThrow: boolean
  /** 確定時のコールバック。skittlesKnocked は API 仕様に従う規約値 */
  onConfirm: (skittlesKnocked: number[]) => void
  /** ミス（0点）確定時のコールバック */
  onMiss?: () => void
  /** フォルト入力を開くコールバック */
  onFaultOpen?: () => void
  disabled?: boolean
  isLoading?: boolean
}

/**
 * スコア入力パネル
 *
 * - 1本モード: 1〜12 のスキットル番号を1つ選択 → 番号がそのまま得点
 *   API送信: skittlesKnocked = [選択した番号]
 * - 複数本モード: 倒した本数（1〜12）を選択 → 本数がそのまま得点
 *   API送信: skittlesKnocked = [0, 0, ..., 0] (選択した本数分の 0)
 *
 * isFirstThrow が切り替わったときに初期モードを反映させるため、
 * 親側で key={isFirstThrow ? 'first' : 'rest'} のように key を渡して remount するか、
 * Inner コンポーネントを介して props を初期値として使う。
 */
export function ScoreInputPanel(props: ScoreInputPanelProps) {
  // key で remount させるため、props.isFirstThrow を rendering key として使う
  return <ScoreInputPanelInner key={String(props.isFirstThrow)} {...props} />
}

function ScoreInputPanelInner({
  isFirstThrow,
  onConfirm,
  onMiss,
  onFaultOpen,
  disabled = false,
  isLoading = false,
}: ScoreInputPanelProps) {
  const [mode, setMode] = useState<InputMode>('multi')
  const [selected, setSelected] = useState<number | null>(null)

  const changeMode = (next: InputMode) => {
    if (disabled || isLoading) return
    setMode(next)
  }

  const handleSelect = (n: number) => {
    if (disabled || isLoading) return
    setSelected((prev) => (prev === n ? null : n))
  }

  const handleConfirm = () => {
    if (selected === null) return
    if (mode === 'single') {
      onConfirm([selected])
    } else {
      // 複数本モード: 本数分の 0 を送る
      onConfirm(Array(selected).fill(0))
    }
    setSelected(null)
  }

  const handleMiss = () => {
    if (disabled || isLoading) return
    setSelected(null)
    onMiss?.()
    onConfirm([])
  }

  const previewScore = selected ?? 0
  const previewLabel =
    selected === null
      ? '未選択'
      : mode === 'single'
        ? `${selected}番 → ${previewScore}点`
        : `${selected}本 → ${previewScore}点`

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="スコア入力">
      {/* モード切替 */}
      <div
        className="flex gap-1 p-1 bg-neutral-100 rounded-md"
        role="tablist"
        aria-label="入力モード"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'multi'}
          onClick={() => changeMode('multi')}
          disabled={disabled || isLoading}
          data-testid="mode-multi"
          className={[
            'flex-1 py-1.5 text-sm font-medium rounded transition-colors',
            mode === 'multi'
              ? 'bg-neutral-0 text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          複数本（本数）
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'single'}
          onClick={() => changeMode('single')}
          disabled={disabled || isLoading}
          data-testid="mode-single"
          className={[
            'flex-1 py-1.5 text-sm font-medium rounded transition-colors',
            mode === 'single'
              ? 'bg-neutral-0 text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          1本（番号）
        </button>
      </div>

{/* 1〜12 パネル */}
      <div
        className="grid grid-cols-3 grid-rows-4 h-56"
        role="radiogroup"
        aria-label={mode === 'single' ? 'スキットル番号' : '倒した本数'}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
          const isSelected = selected === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(n)}
              disabled={disabled || isLoading}
              data-testid={`score-${n}`}
              className={[
                'border text-lg font-bold transition-colors w-full h-full -m-px',
                'flex items-center justify-center',
                'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-[-2px] focus-visible:z-10',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                isSelected
                  ? 'bg-brand-500 text-neutral-0 border-brand-600 z-10'
                  : 'bg-neutral-0 text-neutral-800 border-neutral-300 hover:bg-brand-50 hover:z-10',
              ].join(' ')}
            >
              {n}
            </button>
          )
        })}
      </div>

{/* アクションボタン */}
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="md"
          className="flex-1"
          onClick={handleMiss}
          disabled={disabled || isLoading}
          aria-label="ミス（0点）を記録する"
          data-testid="miss-button"
        >
          ミス
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={handleConfirm}
          disabled={disabled || isLoading || selected === null}
          isLoading={isLoading}
          aria-label={selected === null ? '確定' : `${previewScore}点で確定`}
          data-testid="confirm-throw"
        >
          {selected === null ? '確定' : `${previewScore}点で確定`}
        </Button>
        {onFaultOpen && (
          <Button
            variant="secondary"
            size="md"
            onClick={onFaultOpen}
            disabled={disabled || isLoading}
            data-testid="fault-open"
            aria-label="フォルトを記録する"
          >
            F
          </Button>
        )}
      </div>
    </div>
  )
}

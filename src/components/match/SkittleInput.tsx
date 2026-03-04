'use client'

import { useState, useCallback } from 'react'
import { calculateThrowScore } from '@/lib/scoring'
import { Button } from '@/components/ui/Button'

// モルックの正式な配置（前列から後列へ）
// 前列:  1, 2
// 2列目: 3, 10, 4
// 3列目: 5, 11, 12, 6
// 後列:  7, 9, 8
const SKITTLE_LAYOUT: number[][] = [
  [1, 2],
  [3, 10, 4],
  [5, 11, 12, 6],
  [7, 9, 8],
]

type SkittleInputProps = {
  onConfirm: (skittlesKnocked: number[]) => void
  onMiss?: () => void
  disabled?: boolean
  isLoading?: boolean
}

export function SkittleInput({
  onConfirm,
  onMiss,
  disabled = false,
  isLoading = false,
}: SkittleInputProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const toggleSkittle = useCallback(
    (num: number) => {
      if (disabled) return
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(num)) {
          next.delete(num)
        } else {
          next.add(num)
        }
        return next
      })
    },
    [disabled]
  )

  const handleConfirm = () => {
    const knocked = Array.from(selected).sort((a, b) => a - b)
    onConfirm(knocked)
    setSelected(new Set())
  }

  const handleMiss = () => {
    setSelected(new Set())
    onMiss?.()
    onConfirm([])
  }

  const handleClear = () => setSelected(new Set())

  const handleSelectAll = useCallback(() => {
    if (disabled) return
    const allNums = SKITTLE_LAYOUT.flat()
    setSelected(new Set(allNums))
  }, [disabled])

  const knocked = Array.from(selected)
  const previewScore = calculateThrowScore(knocked)
  const allSkittles = SKITTLE_LAYOUT.flat()
  const isAllSelected = allSkittles.every((n) => selected.has(n))

  return (
    <div className="flex flex-col gap-4" role="group" aria-label="スキットル選択">
      {/* スキットル配置図 */}
      <div
        className="relative flex flex-col-reverse items-center gap-3 py-4 px-2 bg-neutral-100 rounded-xl border border-neutral-200"
        aria-label="スキットルの配置（手前が投擲側）"
      >
        {SKITTLE_LAYOUT.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-center gap-2">
            {row.map((num) => (
              <SkittleButton
                key={num}
                number={num}
                isSelected={selected.has(num)}
                onToggle={toggleSkittle}
                disabled={disabled}
              />
            ))}
          </div>
        ))}

        {/* 投擲ライン（モルッカーリ） */}
        <div className="w-full mt-1 flex items-center gap-2 text-xs text-neutral-400">
          <div className="flex-1 border-t-2 border-dashed border-neutral-300" />
          <span>投擲ライン</span>
          <div className="flex-1 border-t-2 border-dashed border-neutral-300" />
        </div>

        {/* 全選択ボタン（右下） */}
        <button
          type="button"
          onClick={isAllSelected ? handleClear : handleSelectAll}
          disabled={disabled}
          aria-label={isAllSelected ? '全選択を解除' : '全スキットルを選択'}
          className={[
            'absolute bottom-2 right-2',
            'px-2 py-1 rounded text-xs font-medium border transition-colors',
            isAllSelected
              ? 'bg-brand-100 border-brand-400 text-brand-700 hover:bg-brand-200'
              : 'bg-neutral-0 border-neutral-300 text-neutral-600 hover:border-brand-400 hover:text-brand-600',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {isAllSelected ? '全解除' : '全選択'}
        </button>
      </div>

      {/* 選択状態と得点プレビュー */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-neutral-600">
          {selected.size === 0 ? (
            <span className="text-neutral-400">スキットルをタップして選択</span>
          ) : (
            <span>
              選択中:{' '}
              <span className="font-medium text-neutral-900">
                {Array.from(selected).sort((a, b) => a - b).join(', ')}番
              </span>
            </span>
          )}
        </div>
        {selected.size > 0 && (
          <div className="text-lg font-bold text-brand-600" aria-live="polite">
            {previewScore}点
            <span className="text-xs font-normal text-neutral-500 ml-1">（予測）</span>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="lg"
          className="flex-1"
          onClick={handleMiss}
          disabled={disabled || isLoading}
          aria-label="ミス（0点）を記録する"
          data-testid="miss-button"
        >
          ミス（0点）
        </Button>

        {selected.size > 0 && (
          <Button
            variant="subtle"
            size="lg"
            onClick={handleClear}
            disabled={disabled || isLoading}
            aria-label="選択をクリア"
          >
            クリア
          </Button>
        )}

        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={handleConfirm}
          disabled={disabled || isLoading || selected.size === 0}
          isLoading={isLoading}
          aria-label={`${previewScore}点を確定する`}
          data-testid="confirm-throw"
        >
          {selected.size === 0 ? '確定' : `${previewScore}点で確定`}
        </Button>
      </div>
    </div>
  )
}

type SkittleButtonProps = {
  number: number
  isSelected: boolean
  onToggle: (num: number) => void
  disabled: boolean
}

function SkittleButton({ number, isSelected, onToggle, disabled }: SkittleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(number)}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={isSelected ? `${number}番スキットル（選択中）` : `${number}番スキットル`}
      data-testid={`skittle-${number}`}
      className={[
        'w-12 h-12 rounded-full',
        'flex items-center justify-center',
        'text-sm font-bold',
        'border-2 transition-all duration-150',
        'touch-action-manipulation',
        'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        isSelected
          ? 'bg-brand-500 text-neutral-0 border-brand-600 scale-110 shadow-md'
          : 'bg-neutral-0 text-neutral-800 border-neutral-300 hover:border-brand-400 hover:bg-brand-50 active:scale-95',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {number}
    </button>
  )
}

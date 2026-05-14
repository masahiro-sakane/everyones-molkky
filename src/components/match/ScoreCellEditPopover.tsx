'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/Button'

export type EditTarget = {
  throwId: string
  /** 現在の skittlesKnocked（修正前の値） */
  currentSkittles: number[]
  /** クリックされたセルの画面座標 */
  anchorRect: DOMRect
}

type ScoreCellEditPopoverProps = {
  target: EditTarget
  shareCode: string
  /** 更新完了後のコールバック */
  onDone: () => void
  onCancel: () => void
}

type InputMode = 'miss' | 'single' | 'multi'

/**
 * スコアシートのセルをクリックしたときに表示される修正ポップオーバー
 */
export function ScoreCellEditPopover({
  target,
  shareCode,
  onDone,
  onCancel,
}: ScoreCellEditPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  // ポップオーバーの fixed 位置をセル座標から算出
  const popoverStyle = useMemo(() => {
    const POPOVER_W = 288 // w-72 = 18rem = 288px
    const POPOVER_H = 380 // 概算高さ（余裕を持たせる）
    const GAP = 12
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768

    const { top, bottom, left, right } = target.anchorRect

    // 縦方向: セルの下に十分な余裕があれば下、なければ上
    // セルと重ならないよう bottom/top から GAP 分離す
    let topPx: number
    if (bottom + POPOVER_H + GAP <= vh) {
      topPx = bottom + GAP
    } else if (top - POPOVER_H - GAP >= 0) {
      topPx = top - POPOVER_H - GAP
    } else {
      // 上下どちらも足りない場合はビューポート内に収める
      topPx = Math.max(GAP, vh - POPOVER_H - GAP)
    }

    // 横方向: セル中央揃えを基準に左右を調整
    const cellCenterX = (left + right) / 2
    let leftPx = cellCenterX - POPOVER_W / 2

    // 画面右端にかかる場合は左にずらす（セル右端を超えないよう）
    if (leftPx + POPOVER_W + GAP > vw) {
      // セル左端から右方向に出せるか試みる、無理なら左端を基準に右寄せ
      leftPx = Math.max(GAP, vw - POPOVER_W - GAP)
    }
    // 画面左端チェック
    leftPx = Math.max(GAP, leftPx)

    return { position: 'fixed' as const, top: topPx, left: leftPx, width: POPOVER_W, zIndex: 50 }
  }, [target.anchorRect])

  // 現在値からモードと選択値を推定
  const deriveInitial = (skittles: number[]): { mode: InputMode; selected: number | null } => {
    if (skittles.length === 0) return { mode: 'miss', selected: null }
    if (skittles.includes(0)) return { mode: 'multi', selected: skittles.length }
    if (skittles.length === 1) return { mode: 'single', selected: skittles[0] }
    return { mode: 'multi', selected: skittles.length }
  }

  const initial = deriveInitial(target.currentSkittles)
  const [mode, setMode] = useState<InputMode>(initial.mode)
  const [selected, setSelected] = useState<number | null>(initial.selected)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Esc で閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  // 外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onCancel])

  const changeMode = (next: InputMode) => {
    setMode(next)
    setSelected(next === 'miss' ? null : null)
    setError(null)
  }

  const handleSelect = (n: number) => {
    setSelected((prev) => (prev === n ? null : n))
    setError(null)
  }

  const buildSkittles = (): number[] => {
    if (mode === 'miss') return []
    if (selected === null) return []
    if (mode === 'single') return [selected]
    return Array(selected).fill(0)
  }

  const handleSave = async () => {
    if (mode !== 'miss' && selected === null) {
      setError('得点を選択してください')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/matches/${shareCode}/throws/${target.throwId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skittlesKnocked: buildSkittles() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '更新に失敗しました')
        return
      }
      onDone()
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const previewScore =
    mode === 'miss' ? 0 : selected === null ? null : mode === 'single' ? selected : selected

  return (
    <div
      ref={ref}
      className="z-50 bg-neutral-0 border border-neutral-300 rounded-xl shadow-xl p-4"
      style={popoverStyle}
      role="dialog"
      aria-label="得点を修正"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-neutral-800">得点を修正</span>
        <button
          onClick={onCancel}
          className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          aria-label="閉じる"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* モード切替 */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-md mb-3 text-xs">
        {(['miss', 'multi', 'single'] as InputMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => changeMode(m)}
            className={[
              'flex-1 py-1.5 rounded font-medium transition-colors',
              mode === m
                ? 'bg-neutral-0 text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {m === 'miss' ? 'ミス' : m === 'multi' ? '複数本' : '1本'}
          </button>
        ))}
      </div>

      {/* 数値グリッド（miss以外） */}
      {mode !== 'miss' && (
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleSelect(n)}
              className={[
                'h-9 rounded-md border text-sm font-bold transition-all',
                'focus-visible:outline-2 focus-visible:outline-brand-500',
                selected === n
                  ? 'bg-brand-500 text-neutral-0 border-brand-600 scale-105'
                  : 'bg-neutral-0 text-neutral-800 border-neutral-300 hover:border-brand-400 hover:bg-brand-50',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {/* プレビュー */}
      <div className="text-xs text-neutral-500 mb-3 text-center h-4">
        {mode === 'miss'
          ? 'ミス → 0点'
          : previewScore !== null
            ? mode === 'single'
              ? `${previewScore}番 → ${previewScore}点`
              : `${previewScore}本 → ${previewScore}点`
            : '得点を選択してください'}
      </div>

      {error && (
        <p className="text-xs text-danger-600 mb-2" role="alert">{error}</p>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={handleSave}
          isLoading={isLoading}
          disabled={mode !== 'miss' && selected === null}
          data-testid="edit-cell-save"
        >
          保存
        </Button>
      </div>
    </div>
  )
}

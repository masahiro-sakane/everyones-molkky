'use client'

import { useState, useRef, useEffect } from 'react'

type WinHintButtonProps = {
  currentTotal: number
}

const WINNING_SCORE = 50
const HINT_THRESHOLD = 20

function calcCombinations(remaining: number): [number, number][] {
  const results: [number, number][] = []
  for (let a = 1; a <= 12; a++) {
    const b = remaining - a
    if (b >= 1 && b <= 12) {
      results.push([a, b])
    }
  }
  // 今回の得点が大きい順
  results.sort((x, y) => y[0] - x[0])
  return results.slice(0, 3)
}

export function WinHintButton({ currentTotal }: WinHintButtonProps) {
  const remaining = WINNING_SCORE - currentTotal
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (remaining > HINT_THRESHOLD || remaining <= 0) return null

  const combos = calcCombinations(remaining)
  if (combos.length === 0) return null

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-[19px] h-[19px] rounded-full bg-warning-400 text-neutral-0 text-xs font-bold leading-none flex items-center justify-center hover:bg-warning-500 transition-colors"
        aria-label="2投勝利の組み合わせを表示"
        title="2投勝利ヒント"
      >
        !
      </button>

      {open && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 bg-neutral-0 border border-neutral-300 rounded-lg shadow-lg p-2 w-max">
          <p className="text-[10px] text-neutral-500 mb-1.5 whitespace-nowrap">残り{remaining}点 — 2投勝利</p>
          <div className="flex flex-col gap-1">
            {combos.map(([a, b]) => (
              <div key={`${a}-${b}`} className="flex items-center gap-1 text-xs font-medium text-neutral-800">
                <span className="px-1.5 py-0.5 bg-brand-50 border border-brand-200 rounded text-brand-700">{a}</span>
                <span className="text-neutral-400">+</span>
                <span className="px-1.5 py-0.5 bg-brand-50 border border-brand-200 rounded text-brand-700">{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

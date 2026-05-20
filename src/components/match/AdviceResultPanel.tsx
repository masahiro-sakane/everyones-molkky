'use client'

import { useState, useCallback } from 'react'
import { generateAdvice } from '@/services/adviceService'
import type { PinAnalysisResult, AdviceContext, ThrowAdvice } from '@/types/vision'

const ALL_PINS = Array.from({ length: 12 }, (_, i) => i + 1)

const RISK_LABEL: Record<ThrowAdvice['riskLevel'], { label: string; cls: string }> = {
  low: { label: '低', cls: 'bg-success-100 text-success-700 border-success-300' },
  medium: { label: '中', cls: 'bg-warning-100 text-warning-700 border-warning-300' },
  high: { label: '高', cls: 'bg-danger-100 text-danger-700 border-danger-300' },
}

type AdviceResultPanelProps = {
  analysisResult: PinAnalysisResult
  ctx: AdviceContext
}

export function AdviceResultPanel({ analysisResult, ctx }: AdviceResultPanelProps) {
  const [standingPins, setStandingPins] = useState<number[]>(analysisResult.standingPins)

  const togglePin = useCallback((pin: number) => {
    setStandingPins((prev) =>
      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin].sort((a, b) => a - b)
    )
  }, [])

  const advice = generateAdvice(standingPins, ctx)

  return (
    <div className="flex flex-col gap-4">
      {/* 信頼度 */}
      {analysisResult.confidence < 0.7 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-warning-50 border border-warning-300 rounded-md text-xs text-warning-700">
          <span className="shrink-0 font-bold">!</span>
          <span>認識の確信度が低めです（{Math.round(analysisResult.confidence * 100)}%）。下のピン状態を確認・修正してください</span>
        </div>
      )}

      {/* ピン状態（手動修正可能） */}
      <div>
        <p className="text-xs font-semibold text-neutral-600 mb-2">立っているピン（タップで修正）</p>
        <div className="grid grid-cols-6 gap-1.5">
          {ALL_PINS.map((pin) => {
            const standing = standingPins.includes(pin)
            return (
              <button
                key={pin}
                type="button"
                onClick={() => togglePin(pin)}
                className={[
                  'h-9 rounded-md text-sm font-bold border transition-colors',
                  standing
                    ? 'bg-brand-100 border-brand-400 text-brand-700'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-400 line-through',
                ].join(' ')}
                aria-pressed={standing}
                aria-label={`${pin}番 ${standing ? '立っている' : '倒れている'}`}
              >
                {pin}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-[10px] text-neutral-400">
          立: {standingPins.join(', ') || 'なし'} / 倒: {ALL_PINS.filter((p) => !standingPins.includes(p)).join(', ') || 'なし'}
        </p>
      </div>

      {/* 助言 */}
      <div>
        <p className="text-xs font-semibold text-neutral-600 mb-2">助言（残り{ctx.remainingScore}点）</p>
        {advice.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-3">立っているピンがありません</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {advice.map((a, i) => {
              const risk = RISK_LABEL[a.riskLevel]
              return (
                <li
                  key={i}
                  className={[
                    'flex flex-col gap-1 px-3 py-2 rounded-md border text-sm',
                    i === 0 ? 'bg-brand-50 border-brand-300' : 'bg-neutral-50 border-neutral-200',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-brand-600 text-white' : 'bg-neutral-300 text-neutral-700'}`}>
                      {i + 1}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {a.targetPins.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 bg-brand-100 border border-brand-300 rounded text-brand-700 font-bold text-xs">
                          {p}
                        </span>
                      ))}
                      <span className="text-xs text-neutral-500 self-center">
                        → {a.expectedScore}点
                      </span>
                    </div>
                    <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded border ${risk.cls}`}>
                      リスク{risk.label}
                    </span>
                  </div>
                  <p className={`text-xs pl-7 ${a.winsNow ? 'text-success-700 font-semibold' : 'text-neutral-600'}`}>
                    {a.reason}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

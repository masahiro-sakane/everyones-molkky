'use client'

import { useState, useCallback } from 'react'
import { compressImageToBase64 } from '@/lib/imageUtils'
import type { PinAnalysisResult } from '@/types/vision'

type UsePinAnalysisReturn = {
  analyze: (blob: Blob) => Promise<PinAnalysisResult | null>
  result: PinAnalysisResult | null
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function usePinAnalysis(): UsePinAnalysisReturn {
  const [result, setResult] = useState<PinAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (blob: Blob): Promise<PinAnalysisResult | null> => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const imageBase64 = await compressImageToBase64(blob)
      const res = await fetch('/api/vision/analyze-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })

      if (res.status === 429) {
        setError('リクエストが多すぎます。しばらく待ってからお試しください')
        return null
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? '解析に失敗しました')
        return null
      }

      const json = await res.json()
      const data = json.data as PinAnalysisResult
      setResult(data)
      return data
    } catch {
      setError('ネットワークエラーが発生しました')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { analyze, result, isLoading, error, reset }
}

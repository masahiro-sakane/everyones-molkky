'use client'

import { useEffect, useRef, useState } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { usePinAnalysis } from '@/hooks/usePinAnalysis'
import { AdviceResultPanel } from './AdviceResultPanel'
import type { AdviceContext } from '@/types/vision'

const CAMERA_ERROR_MSG: Record<string, string> = {
  'not-supported': 'このブラウザはカメラに対応していません',
  'permission-denied': 'カメラへのアクセスが拒否されました。ブラウザの設定から許可してください',
  'not-found': 'カメラが見つかりません',
  unknown: 'カメラの起動に失敗しました',
}

type CameraCaptureDialogProps = {
  ctx: AdviceContext
  onClose: () => void
}

export function CameraCaptureDialog({ ctx, onClose }: CameraCaptureDialogProps) {
  const { videoRef, isStreaming, error: camError, startCamera, stopCamera, capture } = useCamera()
  const { analyze, result, isLoading, error: analysisError, reset } = usePinAnalysis()
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCapture = async () => {
    const blob = await capture()
    if (!blob) return
    setCapturedBlob(blob)
    setPreviewUrl(URL.createObjectURL(blob))
    stopCamera()
  }

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl(null)
    reset()
    startCamera()
  }

  const handleAnalyze = async () => {
    if (!capturedBlob) return
    await analyze(capturedBlob)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/85"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={dialogRef}
        className="w-full sm:max-w-md bg-neutral-0 rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col max-h-[92svh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="AI投擲アドバイス"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-sm font-bold text-neutral-800">AI投擲アドバイス</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 transition-colors text-lg leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-3">
          {/* カメラプレビュー or 撮影済み画像 */}
          {!result && (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="撮影した画像" className="w-full h-full object-contain" />
              ) : (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
              )}
              {camError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                  <p className="text-white text-xs text-center">{CAMERA_ERROR_MSG[camError]}</p>
                </div>
              )}
            </div>
          )}

          {/* エラー表示 */}
          {analysisError && (
            <div className="px-3 py-2 bg-danger-50 border border-danger-300 rounded-md text-xs text-danger-700">
              {analysisError}
            </div>
          )}

          {/* 解析結果 */}
          {result && (
            <AdviceResultPanel analysisResult={result} ctx={ctx} />
          )}

          {/* アクション */}
          <div className="flex gap-2 justify-end pt-1">
            {!capturedBlob && !camError && (
              <button
                type="button"
                onClick={handleCapture}
                disabled={!isStreaming}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors"
              >
                撮影
              </button>
            )}
            {capturedBlob && !result && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  撮り直す
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      解析中...
                    </>
                  ) : (
                    'AIで解析'
                  )}
                </button>
              </>
            )}
            {result && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  再撮影
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  閉じる
                </button>
              </>
            )}
            {camError && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-neutral-200 text-sm text-neutral-700 hover:bg-neutral-300 transition-colors"
              >
                閉じる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

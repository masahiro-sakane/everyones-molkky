'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type ShareButtonProps = {
  shareCode: string
  iconOnly?: boolean
}

export function ShareButton({ shareCode, iconOnly = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/matches/${shareCode}/watch`
      : `/matches/${shareCode}/watch`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopy = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl })
        return
      } catch (err) {
        // ユーザーがキャンセルした場合（AbortError）は何もしない
        if (err instanceof Error && err.name === 'AbortError') return
        // それ以外のエラー（NotAllowedError等）はクリップボードにフォールバック
      }
    }
    await copyToClipboard()
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'コピー済み' : '観戦URLをコピー'}
        className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        )}
      </button>
    )
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? 'コピー済み' : '観戦URLをコピー'}
    >
      {copied ? '✓ コピー済み' : '共有'}
    </Button>
  )
}

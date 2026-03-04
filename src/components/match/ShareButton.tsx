'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type ShareButtonProps = {
  shareCode: string
}

export function ShareButton({ shareCode }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/matches/${shareCode}/watch`
      : `/matches/${shareCode}/watch`

  const handleCopy = async () => {
    // Web Share API（iOS Safari など）
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl })
        return
      } catch {
        // キャンセルされた場合は何もしない
        return
      }
    }

    // Clipboard API
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // フォールバック: execCommand
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={shareUrl}
        className="flex-1 h-8 px-3 text-xs bg-neutral-50 border border-neutral-300 rounded-md text-neutral-600 truncate"
        aria-label="試合共有URL"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={handleCopy}
        aria-label={copied ? 'コピー済み' : 'URLをコピー'}
      >
        {copied ? '✓ コピー済み' : 'コピー'}
      </Button>
    </div>
  )
}

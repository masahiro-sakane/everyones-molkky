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

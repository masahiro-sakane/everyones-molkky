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

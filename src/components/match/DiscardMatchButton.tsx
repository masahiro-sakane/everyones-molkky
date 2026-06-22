'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type DiscardMatchButtonProps = {
  shareCode: string
  iconOnly?: boolean
}

export function DiscardMatchButton({ shareCode, iconOnly = false }: DiscardMatchButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDiscard = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/matches/${shareCode}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? '削除に失敗しました')
        setIsLoading(false)
        return
      }
      router.push('/')
    } catch {
      setError('ネットワークエラーが発生しました')
      setIsLoading(false)
    }
  }

  const triggerButton = iconOnly ? (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label="試合の記録を破棄"
      data-testid="discard-match-button"
      className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
  ) : (
    <Button
      variant="danger"
      size="sm"
      onClick={() => setIsOpen(true)}
      data-testid="discard-match-button"
    >
      記録を破棄
    </Button>
  )

  return (
    <>
      {triggerButton}

      <Modal
        isOpen={isOpen}
        onClose={() => !isLoading && setIsOpen(false)}
        title="試合の記録を破棄"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              data-testid="discard-cancel"
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDiscard}
              isLoading={isLoading}
              data-testid="discard-confirm"
            >
              破棄する
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-700">
            この試合のすべての記録を削除します。削除後は元に戻せません。
          </p>
          {error && (
            <p className="text-sm text-danger-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}

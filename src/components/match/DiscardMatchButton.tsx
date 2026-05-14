'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type DiscardMatchButtonProps = {
  shareCode: string
}

export function DiscardMatchButton({ shareCode }: DiscardMatchButtonProps) {
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

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setIsOpen(true)}
        data-testid="discard-match-button"
      >
        記録を破棄
      </Button>

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

'use client'

import { useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl font-bold text-danger-100 mb-4">!</p>
        <h1 className="text-xl font-bold text-neutral-900 mb-2">エラーが発生しました</h1>
        <p className="text-sm text-neutral-500 mb-8">
          予期しないエラーが発生しました。もう一度お試しください。
        </p>
        <Button variant="primary" onClick={reset}>
          再試行する
        </Button>
      </div>
    </AppLayout>
  )
}

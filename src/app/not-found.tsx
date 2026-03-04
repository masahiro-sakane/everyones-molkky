import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl font-bold text-neutral-200 mb-4">404</p>
        <h1 className="text-xl font-bold text-neutral-900 mb-2">ページが見つかりません</h1>
        <p className="text-sm text-neutral-500 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link href="/">
          <Button variant="primary">ホームに戻る</Button>
        </Link>
      </div>
    </AppLayout>
  )
}

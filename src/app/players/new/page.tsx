import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CreatePlayerForm } from '@/components/player/CreatePlayerForm'

export const metadata: Metadata = {
  title: 'プレイヤーを追加',
}

export default function NewPlayerPage() {
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link
            href="/players"
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            ← プレイヤー一覧へ
          </Link>
        </div>

        <h1 className="text-xl font-bold text-neutral-900 mb-6">プレイヤーを追加</h1>

        <div className="bg-neutral-0 border border-neutral-300 rounded-lg shadow-sm px-6 py-5">
          <CreatePlayerForm />
        </div>
      </div>
    </AppLayout>
  )
}

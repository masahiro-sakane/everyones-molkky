import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { EditPlayerForm } from '@/components/player/EditPlayerForm'
import { getUserById } from '@/services/userService'

export const metadata: Metadata = {
  title: 'プレイヤーを編集',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditPlayerPage({ params }: PageProps) {
  const { id } = await params
  const player = await getUserById(id)

  if (!player) {
    notFound()
  }

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

        <h1 className="text-xl font-bold text-neutral-900 mb-6">プレイヤーを編集</h1>

        <div className="bg-neutral-0 border border-neutral-300 rounded-lg shadow-sm px-6 py-5">
          <EditPlayerForm playerId={player.id} defaultName={player.name} />
        </div>
      </div>
    </AppLayout>
  )
}

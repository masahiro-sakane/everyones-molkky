import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { PlayerList } from '@/components/player/PlayerList'
import { listUsersWithTeams } from '@/services/userService'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'プレイヤー管理',
  description: 'プレイヤーの作成・編集・削除ができます。',
}

export default async function PlayersPage() {
  const players = await listUsersWithTeams()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-neutral-900">プレイヤー一覧</h1>
          <Button variant="primary" size="md" data-testid="add-player-button">
            <Link href="/players/new">プレイヤーを追加</Link>
          </Button>
        </div>

        <div className="bg-neutral-0 border border-neutral-300 rounded-lg shadow-sm px-6 py-5">
          <PlayerList players={players} />
        </div>
      </div>
    </AppLayout>
  )
}

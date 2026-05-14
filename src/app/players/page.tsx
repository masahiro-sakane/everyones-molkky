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
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-neutral-900">プレイヤー一覧</h1>
          <Button variant="primary" size="md" data-testid="add-player-button">
            <Link href="/players/new">プレイヤーを追加</Link>
          </Button>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 mb-4">まだプレイヤーがいません。</p>
            <Link href="/players/new">
              <Button variant="primary">プレイヤーを追加</Button>
            </Link>
          </div>
        ) : (
          <PlayerList players={players} />
        )}
      </div>
    </AppLayout>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { listMatches } from '@/services/matchService'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '試合一覧',
  description: '過去・進行中の試合一覧を確認できます。',
}

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  WAITING: { label: '待機中', variant: 'default' },
  IN_PROGRESS: { label: '進行中', variant: 'primary' },
  FINISHED: { label: '終了', variant: 'success' },
}

export default async function MatchesPage() {
  const matches = await listMatches()

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-neutral-900">試合一覧</h1>
        <Button variant="primary" size="md">
          <Link href="/matches/new">試合を作成</Link>
        </Button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500 mb-4">まだ試合がありません。</p>
          <Link href="/matches/new">
            <Button variant="primary">最初の試合を作成</Button>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => {
            const statusInfo = STATUS_LABEL[match.status] ?? STATUS_LABEL.WAITING
            const teamNames = match.matchTeams.map((mt) => mt.team.name)
            return (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.shareCode}`}
                  className="block px-4 py-3 bg-neutral-0 border border-neutral-300 rounded-lg hover:border-brand-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-neutral-900 truncate">
                        {teamNames.join(' vs ')}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {new Date(match.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AppLayout>
  )
}

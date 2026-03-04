import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { listMatches } from '@/services/matchService'
import { listTeams } from '@/services/teamService'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  WAITING: { label: '待機中', variant: 'default' },
  IN_PROGRESS: { label: '進行中', variant: 'primary' },
  FINISHED: { label: '終了', variant: 'success' },
}

export default async function HomePage() {
  const [matches, teams] = await Promise.all([listMatches(), listTeams()])

  const recentMatches = matches.slice(0, 5)
  const activeMatches = matches.filter((m) => m.status === 'IN_PROGRESS')

  return (
    <AppLayout>
      {/* Hero */}
      <section className="text-center py-10 px-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/matches/new">
            <Button variant="primary" size="lg">試合を始める</Button>
          </Link>
          <Link href="/teams/new">
            <Button variant="secondary" size="lg">チームを作る</Button>
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* 進行中の試合 */}
        {activeMatches.length > 0 && (
          <section className="md:col-span-2 bg-brand-50 border border-brand-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-brand-700 mb-3">進行中の試合</h2>
            <div className="flex flex-col gap-2">
              {activeMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.shareCode}`}
                  className="flex items-center justify-between bg-neutral-0 border border-brand-200 rounded-md px-3 py-2 hover:border-brand-400 transition-all"
                >
                  <span className="text-sm font-medium text-neutral-900">
                    {match.matchTeams.map((mt) => mt.team.name).join(' vs ')}
                  </span>
                  <Badge variant="primary">進行中</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 直近の試合 */}
        <section className="bg-neutral-0 border border-neutral-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-700">直近の試合</h2>
            <Link href="/matches" className="text-xs text-brand-600 hover:underline">すべて見る</Link>
          </div>
          {recentMatches.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">試合がありません</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentMatches.map((match) => {
                const statusInfo = STATUS_LABEL[match.status] ?? STATUS_LABEL.WAITING
                return (
                  <li key={match.id}>
                    <Link
                      href={`/matches/${match.shareCode}`}
                      className="flex items-center justify-between gap-2 text-sm hover:text-brand-600 transition-colors"
                    >
                      <span className="text-neutral-700 truncate">
                        {match.matchTeams.map((mt) => mt.team.name).join(' vs ')}
                      </span>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* チーム一覧 */}
        <section className="bg-neutral-0 border border-neutral-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-700">チーム</h2>
            <Link href="/teams" className="text-xs text-brand-600 hover:underline">すべて見る</Link>
          </div>
          {teams.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">チームがありません</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {teams.slice(0, 5).map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex items-center justify-between text-sm hover:text-brand-600 transition-colors"
                  >
                    <span className="text-neutral-700 truncate">{team.name}</span>
                    <span className="text-xs text-neutral-400 shrink-0">
                      {team.members.length}名
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <Link href="/teams/new">
              <Button variant="subtle" size="sm">+ チームを作る</Button>
            </Link>
          </div>
        </section>

        {/* クイックリンク */}
        <section className="md:col-span-2 bg-neutral-0 border border-neutral-300 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">統計・分析</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/stats/teams">
              <Button variant="secondary" size="sm">チーム統計</Button>
            </Link>
            <Link href="/stats/users">
              <Button variant="secondary" size="sm">プレイヤー統計</Button>
            </Link>
            <Link href="/matches">
              <Button variant="secondary" size="sm">試合履歴</Button>
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

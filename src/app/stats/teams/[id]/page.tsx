import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatCard } from '@/components/stats/StatCard'
import { getTeamStats } from '@/services/statsService'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function TeamStatsDetailPage({ params }: PageProps) {
  const { id } = await params
  const stats = await getTeamStats(id)

  if (!stats) notFound()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/stats/teams"
            className="text-sm text-brand-600 hover:underline"
          >
            ← チーム統計へ
          </Link>
          <h1 className="text-xl font-bold text-neutral-900 mt-2">{stats.teamName}</h1>
          <p className="text-sm text-neutral-500">累計 {stats.matchCount} 試合の統計</p>
        </div>

        {stats.matchCount === 0 ? (
          <p className="text-center text-neutral-500 py-12">
            完了した試合がありません。
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="勝率"
              value={stats.winRate}
              unit="%"
              sub={`${stats.winCount}勝 ${stats.matchCount - stats.winCount}敗`}
              highlight
            />
            <StatCard
              label="試合数"
              value={stats.matchCount}
              unit="試合"
            />
            <StatCard
              label="平均最終スコア"
              value={stats.avgFinalScore}
              unit="点"
            />
            <StatCard
              label="平均投擲スコア"
              value={stats.avgThrowScore}
              unit="点"
            />
            <StatCard
              label="ミス率"
              value={stats.missRate}
              unit="%"
            />
            <StatCard
              label="失格回数"
              value={stats.disqualifiedCount}
              unit="回"
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

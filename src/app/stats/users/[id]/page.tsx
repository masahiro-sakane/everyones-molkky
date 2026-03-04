import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatCard } from '@/components/stats/StatCard'
import { getUserStats } from '@/services/statsService'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function UserStatsDetailPage({ params }: PageProps) {
  const { id } = await params
  const stats = await getUserStats(id)

  if (!stats) notFound()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/stats/users"
            className="text-sm text-brand-600 hover:underline"
          >
            ← プレイヤー統計へ
          </Link>
          <h1 className="text-xl font-bold text-neutral-900 mt-2">{stats.userName}</h1>
          <p className="text-sm text-neutral-500">累計 {stats.throwCount} 投擲の統計</p>
        </div>

        {stats.throwCount === 0 ? (
          <p className="text-center text-neutral-500 py-12">
            投擲データがありません。
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="平均得点"
              value={stats.avgScore}
              unit="点"
              highlight
            />
            <StatCard
              label="投擲数"
              value={stats.throwCount}
              unit="投"
            />
            <StatCard
              label="最高一投"
              value={stats.highestSingleThrow}
              unit="点"
            />
            <StatCard
              label="累計得点"
              value={stats.maxScore}
              unit="点"
            />
            <StatCard
              label="ミス率"
              value={stats.missRate}
              unit="%"
            />
            <StatCard
              label="フォルト率"
              value={stats.faultRate}
              unit="%"
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

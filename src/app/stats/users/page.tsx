import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { listUserStats } from '@/services/statsService'

export const dynamic = 'force-dynamic'

export default async function UserStatsPage() {
  const stats = await listUserStats()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-neutral-900">プレイヤー統計</h1>
          <p className="text-sm text-neutral-500 mt-1">平均得点順にランキング表示</p>
        </div>

        {stats.length === 0 ? (
          <p className="text-center text-neutral-500 py-16">
            投擲データがありません。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {stats.map((user, index) => (
              <Link
                key={user.userId}
                href={`/stats/users/${user.userId}`}
                className="block bg-neutral-0 border border-neutral-300 rounded-lg px-4 py-4 hover:border-brand-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={[
                        'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                        index === 0
                          ? 'bg-warning-100 text-warning-700'
                          : index === 1
                          ? 'bg-neutral-200 text-neutral-600'
                          : index === 2
                          ? 'bg-warning-50 text-warning-600'
                          : 'bg-neutral-100 text-neutral-500',
                      ].join(' ')}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-neutral-900 truncate">{user.userName}</p>
                      <p className="text-xs text-neutral-400">{user.throwCount}投擲</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-600 tabular-nums">{user.avgScore}</p>
                      <p className="text-xs text-neutral-400">平均得点</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-base font-semibold tabular-nums text-neutral-700">{user.highestSingleThrow}点</p>
                      <p className="text-xs text-neutral-400">最高一投</p>
                    </div>
                  </div>
                </div>

                {/* ミス率バー */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-neutral-400 shrink-0">ミス率</span>
                  <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-danger-400 rounded-full"
                      style={{ width: `${user.missRate}%` }}
                    />
                  </div>
                  <span className="text-xs text-neutral-500 tabular-nums shrink-0">{user.missRate}%</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

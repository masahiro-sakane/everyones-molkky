import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { ScoreChart } from '@/components/stats/ScoreChart'
import { getMatchScoreHistory } from '@/services/statsService'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ shareCode: string }> }

export default async function MatchReplayPage({ params }: PageProps) {
  const { shareCode } = await params
  const history = await getMatchScoreHistory(shareCode)

  if (!history) notFound()

  const teamNames = history.teams.map((t) => t.teamName).join(' vs ')

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/matches/${shareCode}`}
            className="text-sm text-brand-600 hover:underline"
          >
            ← 試合ページへ
          </Link>
          <h1 className="text-xl font-bold text-neutral-900 mt-2">試合リプレイ</h1>
          <p className="text-sm text-neutral-500">{teamNames}</p>
        </div>

        {history.snapshots.length === 0 ? (
          <p className="text-center text-neutral-500 py-12">
            投擲データがありません。
          </p>
        ) : (
          <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4">スコア推移</h2>
            <ScoreChart
              snapshots={history.snapshots}
              teams={history.teams}
              height={240}
            />
          </div>
        )}

        {/* 投擲ログ */}
        {history.snapshots.length > 0 && (
          <div className="mt-4 bg-neutral-0 border border-neutral-300 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-700 mb-3">投擲ログ</h2>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {history.snapshots.map((snap, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs py-1 border-b border-neutral-100 last:border-0"
                >
                  <span className="text-neutral-500">{snap.label}</span>
                  <span className="font-medium text-neutral-700 truncate mx-2">{snap.teamName}</span>
                  <span className="tabular-nums text-brand-600 font-semibold shrink-0">{snap.score}点</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

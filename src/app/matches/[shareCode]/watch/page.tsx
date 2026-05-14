import { notFound } from 'next/navigation'
import { MatchLayout } from '@/components/layout/MatchLayout'
import { MatchView } from '@/components/match/MatchView'
import { getMatchWithScores } from '@/services/matchService'
import { toMatchData } from '@/lib/matchDataMapper'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ shareCode: string }>
}

export default async function WatchPage({ params }: PageProps) {
  const { shareCode } = await params
  const raw = await getMatchWithScores(shareCode)

  if (!raw) {
    notFound()
  }

  const match = toMatchData(raw)

  const isSolo = raw.matchType === 'SOLO'
  const matchTitle = isSolo
    ? raw.matchTeams.map((mt) => mt.team.name).join(', ') + '（個人戦）'
    : raw.matchTeams.map((mt) => mt.team.name).join(' vs ')

  return (
    <MatchLayout>
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-50 border border-brand-200 rounded-full mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-medium text-brand-600">観戦モード</span>
        </div>
        <h1 className="text-lg font-bold text-neutral-900">{matchTitle}</h1>
      </div>

      <MatchView match={match} watchMode />
    </MatchLayout>
  )
}

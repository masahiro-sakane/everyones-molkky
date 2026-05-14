import { notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { MatchView } from '@/components/match/MatchView'
import { getMatchWithScores } from '@/services/matchService'
import { toMatchData } from '@/lib/matchDataMapper'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ shareCode: string }>
}

export default async function MatchPage({ params }: PageProps) {
  const { shareCode } = await params
  const raw = await getMatchWithScores(shareCode)

  if (!raw) {
    notFound()
  }

  const match = toMatchData(raw)

  return (
    <AppLayout>
      <div className="max-w-lg md:max-w-7xl mx-auto">
        <MatchView match={match} />
      </div>
    </AppLayout>
  )
}

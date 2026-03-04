import { notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { MatchBoard } from '@/components/match/MatchBoard'
import { getMatchWithScores } from '@/services/matchService'
import type { MatchData } from '@/hooks/useMatch'

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

  const currentSet = raw.sets.find((s) => s.status === 'IN_PROGRESS') ?? raw.sets.at(-1)

  const match: MatchData = {
    id: raw.id,
    shareCode: raw.shareCode,
    status: raw.status,
    matchTeams: raw.matchTeams.map((mt) => ({
      teamId: mt.teamId,
      order: mt.order,
      team: {
        id: mt.team.id,
        name: mt.team.name,
        members: mt.team.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: { id: m.user.id, name: m.user.name },
        })),
      },
    })),
    sets: raw.sets.map((s) => ({
      id: s.id,
      setNumber: s.setNumber,
      status: s.status,
      winnerId: s.winnerId,
      turns: s.turns.map((turn) => ({
        id: turn.id,
        turnNumber: turn.turnNumber,
        throws: turn.throws.map((t) => ({
          id: t.id,
          teamId: t.teamId,
          userId: t.userId,
          throwOrder: t.throwOrder,
          skittlesKnocked: t.skittlesKnocked,
          score: t.score,
          isFault: t.isFault,
          faultType: t.faultType,
          createdAt: t.createdAt,
          user: t.user ? { id: t.user.id, name: t.user.name } : null,
        })),
      })),
    })),
    teamSetScores: currentSet?.teamSetScores?.map((s) => ({
      teamId: s.teamId,
      totalScore: s.totalScore,
      consecutiveMisses: s.consecutiveMisses,
      isDisqualified: s.isDisqualified,
    })),
  }

  const teamNames = raw.matchTeams.map((mt) => mt.team.name).join(' vs ')

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-50 border border-brand-200 rounded-full mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" aria-hidden="true" />
            <span className="text-xs font-medium text-brand-600">観戦モード</span>
          </div>
          <h1 className="text-lg font-bold text-neutral-900">{teamNames}</h1>
        </div>

        <MatchBoard match={match} watchMode />
      </div>
    </AppLayout>
  )
}

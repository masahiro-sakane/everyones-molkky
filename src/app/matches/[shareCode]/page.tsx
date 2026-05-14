import { notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { MatchView } from '@/components/match/MatchView'
import { getMatchWithScores } from '@/services/matchService'
import type { MatchData } from '@/hooks/useMatch'

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

  // teamSetScoresは現在のセット（最後のIN_PROGRESSセット）から取得
  const currentSet = raw.sets.find((s) => s.status === 'IN_PROGRESS') ?? raw.sets.at(-1)

  // MatchDataに変換（useMatchが期待する形）
  const match: MatchData = {
    id: raw.id,
    shareCode: raw.shareCode,
    status: raw.status,
    matchType: raw.matchType as 'TEAM' | 'SOLO',
    limitType: raw.limitType as 'NONE' | 'TURNS' | 'TIME',
    turnLimit: raw.turnLimit,
    timeLimitMinutes: raw.timeLimitMinutes,
    totalSets: raw.totalSets,
    startedAt: raw.startedAt,
    matchTeams: raw.matchTeams.map((mt) => ({
      teamId: mt.teamId,
      order: mt.order,
      memberOrder: mt.memberOrder,
      team: {
        id: mt.team.id,
        name: mt.team.name,
        isSolo: mt.team.isSolo,
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

  return (
    <AppLayout>
      <div className="max-w-lg md:max-w-7xl mx-auto">
        <MatchView match={match} />
      </div>
    </AppLayout>
  )
}

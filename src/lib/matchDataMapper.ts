import type { MatchData } from '@/hooks/useMatch'

/**
 * getMatchWithScores の戻り値（DBオブジェクト）を MatchData に変換する。
 * page.tsx と API レスポンスからのクライアント更新で共通利用する。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMatchData(raw: any): MatchData {
  const currentSet =
    raw.sets?.find((s: any) => s.status === 'IN_PROGRESS') ??
    raw.sets?.at(-1) ??
    null

  return {
    id: raw.id,
    shareCode: raw.shareCode,
    status: raw.status,
    matchType: raw.matchType as 'TEAM' | 'SOLO',
    limitType: raw.limitType as 'NONE' | 'TURNS' | 'TIME',
    turnLimit: raw.turnLimit ?? null,
    timeLimitMinutes: raw.timeLimitMinutes ?? null,
    totalSets: raw.totalSets ?? 1,
    startedAt: raw.startedAt ?? null,
    matchTeams: (raw.matchTeams ?? []).map((mt: any) => ({
      teamId: mt.teamId,
      order: mt.order,
      memberOrder: mt.memberOrder ?? [],
      team: {
        id: mt.team.id,
        name: mt.team.name,
        isSolo: mt.team.isSolo ?? false,
        members: (mt.team.members ?? []).map((m: any) => ({
          userId: m.userId,
          role: m.role,
          user: { id: m.user.id, name: m.user.name },
        })),
      },
    })),
    sets: (raw.sets ?? []).map((s: any) => ({
      id: s.id,
      setNumber: s.setNumber,
      status: s.status,
      winnerId: s.winnerId ?? null,
      turns: (s.turns ?? []).map((turn: any) => ({
        id: turn.id,
        turnNumber: turn.turnNumber,
        throws: (turn.throws ?? []).map((t: any) => ({
          id: t.id,
          teamId: t.teamId,
          userId: t.userId,
          throwOrder: t.throwOrder,
          skittlesKnocked: t.skittlesKnocked ?? [],
          score: t.score,
          isFault: t.isFault ?? false,
          faultType: t.faultType ?? null,
          createdAt: t.createdAt,
          user: t.user ? { id: t.user.id, name: t.user.name } : null,
        })),
      })),
    })),
    teamSetScores: currentSet?.teamSetScores?.map((s: any) => ({
      teamId: s.teamId,
      totalScore: s.totalScore,
      consecutiveMisses: s.consecutiveMisses,
      isDisqualified: s.isDisqualified,
    })),
  }
}

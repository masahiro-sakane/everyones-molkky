import { db } from '@/lib/db'

// ---- チーム統計 ----

export type TeamStats = {
  teamId: string
  teamName: string
  matchCount: number
  winCount: number
  winRate: number
  avgFinalScore: number
  avgThrowScore: number
  missRate: number
  disqualifiedCount: number
}

export async function getTeamStats(teamId: string): Promise<TeamStats | null> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      matchTeams: {
        include: {
          match: {
            include: {
              sets: {
                include: {
                  teamSetScores: { where: { teamId } },
                  turns: {
                    include: {
                      throws: { where: { teamId } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!team) return null

  const finishedMatches = team.matchTeams.filter(
    (mt) => mt.match.status === 'FINISHED'
  )

  const matchCount = finishedMatches.length
  let winCount = 0
  let totalFinalScore = 0
  let totalThrowScore = 0
  let totalThrows = 0
  let totalMisses = 0
  let disqualifiedCount = 0

  for (const mt of finishedMatches) {
    const sets = mt.match.sets
    for (const set of sets) {
      const setScore = set.teamSetScores[0]
      if (!setScore) continue

      // 勝利判定
      if (set.winnerId === teamId) winCount++
      if (setScore.isDisqualified) disqualifiedCount++

      // 最終スコア
      totalFinalScore += setScore.totalScore

      // 投擲統計
      for (const turn of set.turns) {
        for (const t of turn.throws) {
          totalThrows++
          totalThrowScore += t.score
          if (t.skittlesKnocked.length === 0 && !t.isFault) totalMisses++
          if (t.isFault) totalMisses++
        }
      }
    }
  }

  return {
    teamId,
    teamName: team.name,
    matchCount,
    winCount,
    winRate: matchCount > 0 ? Math.round((winCount / matchCount) * 100) : 0,
    avgFinalScore: matchCount > 0 ? Math.round(totalFinalScore / matchCount) : 0,
    avgThrowScore: totalThrows > 0 ? Math.round((totalThrowScore / totalThrows) * 10) / 10 : 0,
    missRate: totalThrows > 0 ? Math.round((totalMisses / totalThrows) * 100) : 0,
    disqualifiedCount,
  }
}

export async function listTeamStats(): Promise<TeamStats[]> {
  const teams = await db.team.findMany({ select: { id: true } })
  const results = await Promise.all(teams.map((t) => getTeamStats(t.id)))
  return results
    .filter((s): s is TeamStats => s !== null)
    .sort((a, b) => b.winRate - a.winRate || b.matchCount - a.matchCount)
}

// ---- ユーザー統計 ----

export type UserStats = {
  userId: string
  userName: string
  throwCount: number
  avgScore: number
  missRate: number
  faultRate: number
  maxScore: number
  highestSingleThrow: number
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      throws: true,
    },
  })

  if (!user) return null

  const throws = user.throws
  const throwCount = throws.length

  if (throwCount === 0) {
    return {
      userId,
      userName: user.name,
      throwCount: 0,
      avgScore: 0,
      missRate: 0,
      faultRate: 0,
      maxScore: 0,
      highestSingleThrow: 0,
    }
  }

  const totalScore = throws.reduce((sum, t) => sum + t.score, 0)
  const missCount = throws.filter(
    (t) => t.skittlesKnocked.length === 0 && !t.isFault
  ).length
  const faultCount = throws.filter((t) => t.isFault).length
  const maxScore = Math.max(...throws.map((t) => t.score))

  return {
    userId,
    userName: user.name,
    throwCount,
    avgScore: Math.round((totalScore / throwCount) * 10) / 10,
    missRate: Math.round((missCount / throwCount) * 100),
    faultRate: Math.round((faultCount / throwCount) * 100),
    maxScore: throws.reduce((sum, t) => sum + t.score, 0),
    highestSingleThrow: maxScore,
  }
}

export async function listUserStats(): Promise<UserStats[]> {
  const users = await db.user.findMany({ select: { id: true } })
  const results = await Promise.all(users.map((u) => getUserStats(u.id)))
  return results
    .filter((s): s is UserStats => s !== null)
    .sort((a, b) => b.avgScore - a.avgScore)
}

// ---- 試合リプレイ用スコア推移 ----

export type ScoreSnapshot = {
  throwIndex: number
  teamId: string
  teamName: string
  score: number
  label: string  // 表示用「ターン1-1」など
}

export async function getMatchScoreHistory(shareCode: string): Promise<{
  teams: { teamId: string; teamName: string }[]
  snapshots: ScoreSnapshot[]
} | null> {
  const match = await db.match.findUnique({
    where: { shareCode },
    include: {
      matchTeams: {
        include: { team: true },
        orderBy: { order: 'asc' },
      },
      sets: {
        orderBy: { setNumber: 'asc' },
        include: {
          turns: {
            orderBy: { turnNumber: 'asc' },
            include: {
              throws: {
                orderBy: { throwOrder: 'asc' },
                include: { user: true },
              },
            },
          },
          teamSetScores: true,
        },
      },
    },
  })

  if (!match) return null

  const teams = match.matchTeams.map((mt) => ({
    teamId: mt.teamId,
    teamName: mt.team.name,
  }))

  // チームごとの累積スコアを追跡
  const runningScores: Record<string, number> = {}
  for (const t of teams) runningScores[t.teamId] = 0

  const snapshots: ScoreSnapshot[] = []
  let throwIndex = 0

  for (const set of match.sets) {
    for (const turn of set.turns) {
      for (const t of turn.throws) {
        runningScores[t.teamId] = (runningScores[t.teamId] ?? 0) + t.score

        const teamName = teams.find((tm) => tm.teamId === t.teamId)?.teamName ?? ''
        snapshots.push({
          throwIndex: throwIndex++,
          teamId: t.teamId,
          teamName,
          score: runningScores[t.teamId],
          label: `T${turn.turnNumber}-${t.throwOrder}`,
        })
      }
    }
  }

  return { teams, snapshots }
}

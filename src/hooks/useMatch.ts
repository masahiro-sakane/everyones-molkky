'use client'

import { useMemo } from 'react'

// MatchServiceが返す型に合わせた軽量型定義
type TeamMember = {
  userId: string
  role: string
  user: { id: string; name: string }
}

type Team = {
  id: string
  name: string
  isSolo: boolean
  members: TeamMember[]
}

type MatchTeam = {
  teamId: string
  order: number
  memberOrder: string[]
  team: Team
}

type ThrowRecord = {
  id: string
  teamId: string
  userId: string
  throwOrder: number
  skittlesKnocked: number[]
  score: number
  isFault: boolean
  faultType: string | null
  createdAt: Date | string
  user: { id: string; name: string } | null
}

type Turn = {
  id: string
  turnNumber: number
  throws: ThrowRecord[]
}

type Set = {
  id: string
  setNumber: number
  status: string
  winnerId: string | null
  turns: Turn[]
}

type TeamSetScore = {
  teamId: string
  totalScore: number
  consecutiveMisses: number
  isDisqualified: boolean
}

export type MatchData = {
  id: string
  shareCode: string
  status: string
  matchType: 'TEAM' | 'SOLO'
  limitType: 'NONE' | 'TURNS' | 'TIME'
  turnLimit: number | null
  timeLimitMinutes: number | null
  totalSets: number
  startedAt: Date | string | null
  matchTeams: MatchTeam[]
  sets: Set[]
  teamSetScores?: TeamSetScore[]
}

export type TeamScoreDisplay = {
  teamId: string
  teamName: string
  isSolo: boolean
  totalScore: number
  consecutiveMisses: number
  isDisqualified: boolean
  isWinner: boolean
  order: number
}

export type CurrentThrowerInfo = {
  teamId: string
  teamName: string
  teamOrder: number
  totalTeams: number
  userId: string
  userName: string
}

export type ThrowHistoryEntry = {
  id: string
  score: number
  skittlesKnocked: number[]
  isFault: boolean
  faultType: string | null
  user: { name: string } | null
  teamName: string
  createdAt: Date | string
}

/**
 * memberOrderに従ってメンバーをフィルタリング・並べ替える
 * memberOrderが空または未指定の場合はそのままの順序を返す
 * memberOrderに含まれないメンバーはこの試合から除外される
 */
function sortMembers(members: TeamMember[], memberOrder: string[]): TeamMember[] {
  if (memberOrder.length === 0) return members
  return memberOrder
    .map((id) => members.find((m) => m.userId === id))
    .filter((m): m is TeamMember => m !== undefined)
}

/**
 * 試合データから現在の状態を計算するフック
 * データ取得は Server Component 側で行い、この Hook は計算のみ担当する
 */
export function useMatch(match: MatchData) {
  // 現在の進行中セット
  const currentSet = useMemo(
    () => match.sets.find((s) => s.status === 'IN_PROGRESS') ?? match.sets.at(-1) ?? null,
    [match.sets]
  )

  // チームスコアを計算（ターンの投擲から集計）
  const teamScores = useMemo<TeamScoreDisplay[]>(() => {
    // teamSetScoresが渡されていればそちらを使う
    if (match.teamSetScores && match.teamSetScores.length > 0) {
      const winnerTeamId = currentSet?.winnerId
      return match.matchTeams.map((mt) => {
        const score = match.teamSetScores!.find((s) => s.teamId === mt.teamId)
        return {
          teamId: mt.teamId,
          teamName: mt.team.name,
          isSolo: mt.team.isSolo,
          totalScore: score?.totalScore ?? 0,
          consecutiveMisses: score?.consecutiveMisses ?? 0,
          isDisqualified: score?.isDisqualified ?? false,
          isWinner: mt.teamId === winnerTeamId,
          order: mt.order,
        }
      })
    }

    // フォールバック: スコアがない場合は0で初期化
    return match.matchTeams.map((mt) => ({
      teamId: mt.teamId,
      teamName: mt.team.name,
      isSolo: mt.team.isSolo,
      totalScore: 0,
      consecutiveMisses: 0,
      isDisqualified: false,
      isWinner: false,
      order: mt.order,
    }))
  }, [match.matchTeams, match.teamSetScores, currentSet?.winnerId])

  // 現在の投擲者を特定
  const currentThrower = useMemo<CurrentThrowerInfo | null>(() => {
    if (match.status !== 'IN_PROGRESS') return null

    const turns = currentSet?.turns ?? []
    const latestTurn = turns.at(-1)
    if (!latestTurn) return null

    // 空ターン（投擲待ち）のターン番号を使う
    // 投擲済みターンが末尾の場合（Optimistic UI等）は +1 した番号を使う
    const currentTurnNumber = latestTurn.throws.length === 0
      ? latestTurn.turnNumber
      : latestTurn.turnNumber + 1

    const teamCount = match.matchTeams.length
    const teamIndex = (currentTurnNumber - 1) % teamCount
    const currentMatchTeam = match.matchTeams.find((mt) => mt.order === teamIndex + 1)
    if (!currentMatchTeam) return null

    const team = currentMatchTeam.team
    const members = sortMembers(team.members, currentMatchTeam.memberOrder)
    const memberIndex = Math.floor((currentTurnNumber - 1) / teamCount) % Math.max(members.length, 1)
    const thrower = members[memberIndex] ?? members[0]

    return {
      teamId: team.id,
      teamName: team.name,
      teamOrder: currentMatchTeam.order,
      totalTeams: match.matchTeams.length,
      userId: thrower?.userId ?? '',
      userName: thrower?.user.name ?? 'メンバーなし',
    }
  }, [match.status, match.matchTeams, currentSet])

  // 次の投擲者を特定
  const nextThrower = useMemo<CurrentThrowerInfo | null>(() => {
    if (match.status !== 'IN_PROGRESS') return null

    const turns = currentSet?.turns ?? []
    const latestTurn = turns.at(-1)
    if (!latestTurn) return null

    const teamCount = match.matchTeams.length
    const disqualifiedIds = new Set(
      (match.teamSetScores ?? []).filter((s) => s.isDisqualified).map((s) => s.teamId)
    )

    // 現在のターン番号の次から検索
    const currentTurnNumber = latestTurn.throws.length === 0
      ? latestTurn.turnNumber
      : latestTurn.turnNumber + 1

    let nextTurnNumber = currentTurnNumber + 1
    for (let i = 0; i < teamCount; i++) {
      const teamIndex = (nextTurnNumber - 1) % teamCount
      const nextMatchTeam = match.matchTeams.find((mt) => mt.order === teamIndex + 1)
      if (nextMatchTeam && !disqualifiedIds.has(nextMatchTeam.teamId)) {
        const team = nextMatchTeam.team
        const members = sortMembers(team.members, nextMatchTeam.memberOrder)
        const memberIndex = Math.floor((nextTurnNumber - 1) / teamCount) % Math.max(members.length, 1)
        const thrower = members[memberIndex] ?? members[0]
        return {
          teamId: team.id,
          teamName: team.name,
          teamOrder: nextMatchTeam.order,
          totalTeams: teamCount,
          userId: thrower?.userId ?? '',
          userName: thrower?.user.name ?? 'メンバーなし',
        }
      }
      nextTurnNumber++
    }
    return null
  }, [match.status, match.matchTeams, match.teamSetScores, currentSet])

  // 投擲履歴（全ターンをフラット化）
  const throwHistory = useMemo<ThrowHistoryEntry[]>(() => {
    const turns = currentSet?.turns ?? []
    return turns.flatMap((turn) =>
      turn.throws.map((t) => {
        const matchTeam = match.matchTeams.find((mt) => mt.teamId === t.teamId)
        return {
          id: t.id,
          score: t.score,
          skittlesKnocked: t.skittlesKnocked,
          isFault: t.isFault,
          faultType: t.faultType,
          user: t.user,
          teamName: matchTeam?.team.name ?? '不明',
          createdAt: t.createdAt,
        }
      })
    )
  }, [currentSet, match.matchTeams])

  // 新たに失格になったチームを検出
  const newlyDisqualifiedTeams = useMemo(
    () => teamScores.filter((t) => t.isDisqualified),
    [teamScores]
  )

  // 試合優勝者: 試合FINISHED時は最多セット勝利チーム、単セットは最終セット勝者
  const winnerTeamId = useMemo(() => {
    if (match.status !== 'FINISHED') return currentSet?.winnerId ?? null
    // セット勝利数を集計
    const wins = new Map<string, number>()
    for (const s of match.sets) {
      if (s.winnerId) wins.set(s.winnerId, (wins.get(s.winnerId) ?? 0) + 1)
    }
    if (wins.size === 0) return currentSet?.winnerId ?? null
    const maxWins = Math.max(...wins.values())
    const topTeams = [...wins.entries()].filter(([, w]) => w === maxWins)
    return topTeams.length === 1 ? topTeams[0][0] : (currentSet?.winnerId ?? null)
  }, [match.status, match.sets, currentSet])

  // セット間遷移状態: 直近セットがFINISHEDで次のセットが残っている場合のみ表示
  const setTransitionInfo = useMemo(() => {
    const lastSet = match.sets.at(-1)
    if (match.status !== 'IN_PROGRESS') return null
    if (!lastSet || lastSet.status !== 'FINISHED') return null
    const finishedSets = match.sets.filter((s) => s.status === 'FINISHED').length
    const remainingSets = match.totalSets - finishedSets
    if (remainingSets <= 0) return null
    return {
      completedSetNumber: lastSet.setNumber,
      totalSets: match.totalSets,
      winnerId: lastSet.winnerId,
      winnerName: match.matchTeams.find((mt) => mt.teamId === lastSet.winnerId)?.team.name ?? null,
      remainingSets,
    }
  }, [match.status, match.sets, match.totalSets, match.matchTeams])

  // 現在の経過ラウンド数（アクティブチームが1回ずつ投擲したラウンド）
  // 失格チームがいるとturnNumberが飛ぶため、アクティブチーム数で割る
  const currentRound = useMemo(() => {
    const latestTurnNumber = currentSet?.turns.at(-1)?.turnNumber ?? 0
    const activeTeamCount = teamScores.filter((t) => !t.isDisqualified).length
    const effectiveCount = activeTeamCount > 0 ? activeTeamCount : match.matchTeams.length
    return effectiveCount > 0 ? Math.floor(latestTurnNumber / effectiveCount) : 0
  }, [currentSet, teamScores, match.matchTeams.length])

  // 残りターン数（ターン制限の場合）
  const remainingRounds = useMemo(() => {
    if (match.limitType !== 'TURNS' || match.turnLimit === null) return null
    return Math.max(0, match.turnLimit - currentRound)
  }, [match.limitType, match.turnLimit, currentRound])

  return {
    currentSet,
    teamScores,
    currentThrower,
    nextThrower,
    throwHistory,
    winnerTeamId,
    newlyDisqualifiedTeams,
    isFinished: match.status === 'FINISHED',
    currentRound,
    remainingRounds,
    setTransitionInfo,
  }
}

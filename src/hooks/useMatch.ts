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
  members: TeamMember[]
}

type MatchTeam = {
  teamId: string
  order: number
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
  matchTeams: MatchTeam[]
  sets: Set[]
  teamSetScores?: TeamSetScore[]
}

export type TeamScoreDisplay = {
  teamId: string
  teamName: string
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

    // ターン番号からチームを特定（ラウンドロビン）
    const teamCount = match.matchTeams.length
    const teamIndex = (latestTurn.turnNumber - 1) % teamCount
    const currentMatchTeam = match.matchTeams.find((mt) => mt.order === teamIndex + 1)
    if (!currentMatchTeam) return null

    const team = currentMatchTeam.team
    // チームメンバーの先頭を投擲者とする（後でローテーション対応可能）
    const members = team.members
    const memberIndex = Math.floor((latestTurn.turnNumber - 1) / teamCount) % Math.max(members.length, 1)
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

  // 勝者
  const winnerTeamId = currentSet?.winnerId ?? null

  return {
    currentSet,
    teamScores,
    currentThrower,
    throwHistory,
    winnerTeamId,
    newlyDisqualifiedTeams,
    isFinished: match.status === 'FINISHED',
  }
}

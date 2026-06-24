'use client'

import { useMemo } from 'react'
import type { MatchData } from './useMatch'
import type {
  CumulativeValue,
  CurrentCellPosition,
  ScoreCellValue,
  ScoreSheetCell,
  ScoreSheetData,
  ScoreSheetRow,
  TeamColumn,
  TeamRanking,
} from '@/types/scoreSheet'

const WINNING_SCORE = 50
const RESET_SCORE = 25
const MAX_CONSECUTIVE_MISSES = 3
const FAULT_RESET_THRESHOLD = 37

type TeamMember = {
  userId: string
  user: { id: string; name: string }
}

/**
 * memberOrder に従ってメンバーをフィルタリング・並び替える
 * memberOrderに含まれないメンバーはこの試合から除外される
 */
function sortMembers<T extends TeamMember>(
  members: T[],
  memberOrder: string[]
): T[] {
  if (memberOrder.length === 0) return members
  return memberOrder
    .map((id) => members.find((m) => m.userId === id))
    .filter((m): m is T => m !== undefined)
}

/**
 * 投擲レコードから1セルの値を導出する
 *
 * @param throwScore この投擲のスコア
 * @param prevTotal 投擲前の累計
 * @param isFault フォルトか
 * @param faultType フォルト種別
 */
function deriveCellValue(
  throwScore: number,
  prevTotal: number,
  isFault: boolean,
  faultType: string | null,
  skittlesKnocked: number[] = []
): { value: ScoreCellValue; nextTotal: number; isWinner: boolean; hasReset: boolean } {
  // フォルトの場合
  if (isFault) {
    // STEP_OVER で 37+ なら25リセット、それ以外は累計変わらず
    if (faultType === 'STEP_OVER' && prevTotal >= FAULT_RESET_THRESHOLD) {
      return {
        value: { kind: 'fault', faultType: faultType ?? '' },
        nextTotal: RESET_SCORE,
        isWinner: false,
        hasReset: true,
      }
    }
    return {
      value: { kind: 'fault', faultType: faultType ?? '' },
      nextTotal: prevTotal,
      isWinner: false,
      hasReset: false,
    }
  }

  // ミス（0点）
  if (throwScore === 0) {
    return {
      value: { kind: 'miss' },
      nextTotal: prevTotal,
      isWinner: false,
      hasReset: false,
    }
  }

  const candidateTotal = prevTotal + throwScore

  // ちょうど50 → ゴール
  if (candidateTotal === WINNING_SCORE) {
    return {
      value: { kind: 'goal', score: throwScore },
      nextTotal: WINNING_SCORE,
      isWinner: true,
      hasReset: false,
    }
  }

  // 50超 → 25リセット
  if (candidateTotal > WINNING_SCORE) {
    return {
      value: { kind: 'reset', score: throwScore },
      nextTotal: RESET_SCORE,
      isWinner: false,
      hasReset: true,
    }
  }

  return {
    value: { kind: 'score', n: throwScore, isSingle: skittlesKnocked.length === 1 },
    nextTotal: candidateTotal,
    isWinner: false,
    hasReset: false,
  }
}

/**
 * 試合データからスコアシート2D構造を計算する
 */
export function useScoreSheet(match: MatchData): ScoreSheetData {
  return useMemo(() => {
    // 進行中セット
    const currentSet =
      match.sets.find((s) => s.status === 'IN_PROGRESS') ?? match.sets.at(-1) ?? null

    // === 列定義の構築 ===
    const memberCount = Math.max(
      1,
      ...match.matchTeams.map((mt) => mt.team.members.length)
    )

    const columns: TeamColumn[] = match.matchTeams
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((mt) => {
        const sortedMembers = sortMembers(mt.team.members, mt.memberOrder)
        return {
          teamId: mt.teamId,
          teamName: mt.team.name,
          order: mt.order,
          members: sortedMembers.map((m) => ({
            userId: m.userId,
            userName: m.user.name,
          })),
          isDisqualified: false, // 後で埋める
          isWinner: false, // 後で埋める
        }
      })

    // メンバーが足りないチームのために空メンバー列をパディング
    columns.forEach((col) => {
      while (col.members.length < memberCount) {
        col.members.push({ userId: '', userName: '' })
      }
    })

    // === ラウンドへの投擲振り分け ===
    // 1ラウンド = teamCount * memberCount 投擲
    // turn は1ターン=チームの全メンバー分の投擲を含む（既存useMatchの解釈に従う）
    // ただし実際の Turn.turnNumber はチームごとに1ずつ進む設計
    // ラウンド分解: round = floor((turnNumber - 1) / teamCount)
    //              チームindex = (turnNumber - 1) % teamCount
    //              メンバーindex = floor((turnNumber - 1) / teamCount) % memberCount
    //
    // しかし memberCount を導入すると無限ラウンドになるので、
    // スコアシート上は「行 = 全チームの1ラウンド」とする
    // 1ラウンド内の各チームセルは、そのチーム＋ラウンドに対応するメンバー1名の投擲
    // メンバーローテーション: round内のメンバー index = floor((turnNumber-1) / teamCount) % memberCount

    // === ターンを turnNumber 順に処理 ===
    // 1ターン = 1チームの1投擲
    // turnNumber から行(ラウンド)とチームが決まる:
    //   teamIndex = (turnNumber - 1) % teamCount  → columns[teamIndex]
    //   rowIndex  = floor((turnNumber - 1) / teamCount)
    const teamCount = columns.length

    type TurnThrow = {
      throwId: string
      teamId: string
      userId: string
      score: number
      isFault: boolean
      faultType: string | null
      skittlesKnocked: number[]
      turnNumber: number
      rowIndex: number   // 0始まり
      colIndex: number   // columns内のindex
    }

    const turnThrows: TurnThrow[] = []
    if (currentSet) {
      for (const turn of currentSet.turns) {
        const colIndex = (turn.turnNumber - 1) % teamCount
        const rowIndex = Math.floor((turn.turnNumber - 1) / teamCount)
        for (const t of turn.throws) {
          turnThrows.push({
            throwId: t.id,
            teamId: t.teamId,
            userId: t.userId,
            score: t.score,
            isFault: t.isFault,
            faultType: t.faultType,
            skittlesKnocked: t.skittlesKnocked,
            turnNumber: turn.turnNumber,
            rowIndex,
            colIndex,
          })
        }
      }
    }

    // 行数: 実際の最大行 or 最低行数
    // ターン制限がある場合はそのラウンド数を最低行数にする
    const maxRow = turnThrows.length > 0
      ? Math.max(...turnThrows.map((t) => t.rowIndex)) + 1
      : 0
    const defaultMinRows = match.limitType === 'TURNS' && match.turnLimit !== null
      ? match.turnLimit
      : 12
    const minRows = Math.max(memberCount, defaultMinRows)
    const totalRows = Math.max(maxRow, minRows)

    // turnThrowsをrowIndex+teamIdで引けるMapに変換
    const throwByRowAndTeam = new Map<string, TurnThrow>()
    for (const t of turnThrows) {
      throwByRowAndTeam.set(`${t.rowIndex}:${t.teamId}`, t)
    }

    // チームごとの投擲リスト（currentCell計算用）
    const throwsByTeam = new Map<string, TurnThrow[]>()
    for (const t of turnThrows) {
      if (!throwsByTeam.has(t.teamId)) throwsByTeam.set(t.teamId, [])
      throwsByTeam.get(t.teamId)!.push(t)
    }

    // 各チームの累計を行ごとに保持
    const cumulativeByTeam = new Map<string, number>()
    const consecutiveMissesByTeam = new Map<string, number>()
    const throwCountByTeam = new Map<string, number>()
    const disqualifiedTeams = new Set<string>()
    const winnerTeams = new Set<string>()

    columns.forEach((col) => {
      cumulativeByTeam.set(col.teamId, 0)
      consecutiveMissesByTeam.set(col.teamId, 0)
      throwCountByTeam.set(col.teamId, 0)
    })

    const rows: ScoreSheetRow[] = []

    for (let r = 0; r < totalRows; r++) {
      const cellsByTeam = new Map<string, ScoreSheetCell[]>()
      const cumulativeByTeamSnapshot = new Map<string, CumulativeValue>()

      for (const col of columns) {
        const throwAtRow = throwByRowAndTeam.get(`${r}:${col.teamId}`) ?? null

        const prevTotal = cumulativeByTeam.get(col.teamId) ?? 0
        const prevMisses = consecutiveMissesByTeam.get(col.teamId) ?? 0
        const isDisqualified = disqualifiedTeams.has(col.teamId)
        const isWinner = winnerTeams.has(col.teamId)

        let throwCellValue: ScoreCellValue
        let nextTotal = prevTotal
        let rowWinner = false
        let rowReset = false
        let becameDisqualified = false

        if (isDisqualified) {
          throwCellValue = { kind: 'disqualified' }
        } else if (isWinner) {
          throwCellValue = { kind: 'empty' }
        } else if (throwAtRow) {
          const derived = deriveCellValue(
            throwAtRow.score,
            prevTotal,
            throwAtRow.isFault,
            throwAtRow.faultType,
            throwAtRow.skittlesKnocked
          )
          throwCellValue = derived.value
          nextTotal = derived.nextTotal
          rowWinner = derived.isWinner
          rowReset = derived.hasReset

          if (throwAtRow.score === 0) {
            const newMisses = prevMisses + 1
            consecutiveMissesByTeam.set(col.teamId, newMisses)
            if (newMisses >= MAX_CONSECUTIVE_MISSES) {
              disqualifiedTeams.add(col.teamId)
              becameDisqualified = true
            }
          } else {
            consecutiveMissesByTeam.set(col.teamId, 0)
          }

          if (rowWinner) winnerTeams.add(col.teamId)
        } else {
          throwCellValue = { kind: 'empty' }
        }

        cumulativeByTeam.set(col.teamId, nextTotal)
        if (throwAtRow) {
          throwCountByTeam.set(col.teamId, (throwCountByTeam.get(col.teamId) ?? 0) + 1)
        }

        // 投擲したメンバーのインデックスを userId で特定する
        const memberIdxByUserId = throwAtRow
          ? col.members.findIndex((m) => m.userId === throwAtRow.userId)
          : -1
        const memberIdx = memberIdxByUserId >= 0 ? memberIdxByUserId : 0

        // 各メンバー列のセルを作成（投擲値は投擲したメンバーの列にのみ）
        const cells: ScoreSheetCell[] = col.members.map((member, mi) => {
          const isThrowCell = throwAtRow !== null && mi === memberIdx
          return {
            teamId: col.teamId,
            userId: member.userId,
            throwId: isThrowCell ? (throwAtRow?.throwId ?? null) : null,
            throwIndex: mi + 1,
            value: isThrowCell ? throwCellValue : { kind: 'empty' as const },
          }
        })

        cellsByTeam.set(col.teamId, cells)

        cumulativeByTeamSnapshot.set(col.teamId, {
          total: nextTotal,
          isWinner: rowWinner,
          hasReset: rowReset,
          becameDisqualified,
          throwCount: throwCountByTeam.get(col.teamId) ?? 0,
          hasThrowInRow: throwAtRow !== null,
        })
      }

      rows.push({
        rowIndex: r + 1,
        cellsByTeam,
        cumulativeByTeam: cumulativeByTeamSnapshot,
      })
    }

    // 列の失格/勝利を反映
    for (const col of columns) {
      col.isDisqualified = disqualifiedTeams.has(col.teamId)
      col.isWinner = winnerTeams.has(col.teamId)
    }

    // === 現在の投擲セル ===
    // 次に投擲すべきターン番号を特定する
    // - DBでは投擲後に次のターンが作成される（空ターン=投擲待ち）
    // - テストなど次ターンが未作成の場合は最後の投擲済みターン+1を使う
    let currentCell: CurrentCellPosition | null = null
    if (match.status === 'IN_PROGRESS' && currentSet) {
      const turns = currentSet.turns
      const lastTurn = turns.at(-1)
      if (!lastTurn) {
        // ターンが1件もない場合は最初のターン
        const col = columns[0]
        if (col && !col.isDisqualified && !col.isWinner) {
          currentCell = { rowIndex: 1, teamId: col.teamId, userId: col.members[0]?.userId ?? '' }
        }
      } else {
        // 次のターン番号: 空ターン（まだ投擲なし）があればそれ、なければ +1
        const nextTurnNumber = lastTurn.throws.length === 0
          ? lastTurn.turnNumber
          : lastTurn.turnNumber + 1

        // 失格・勝者チームをスキップして次の有効ターンを探す
        let targetTurnNumber = nextTurnNumber
        for (let i = 0; i < teamCount; i++) {
          const colIndex = (targetTurnNumber - 1) % teamCount
          const col = columns[colIndex]
          if (col && !col.isDisqualified && !col.isWinner) {
            const rowIndex = Math.floor((targetTurnNumber - 1) / teamCount)
            // このチームの最後の投擲から次のメンバーを特定
            const teamThrowList = throwsByTeam.get(col.teamId) ?? []
            const lastThrowForTeam = teamThrowList.at(-1)
            const actualMembers = col.members.filter((m) => m.userId !== '')
            const actualMemberCount = Math.max(actualMembers.length, 1)
            let memberIdx: number
            if (lastThrowForTeam) {
              const lastMemberIdx = actualMembers.findIndex((m) => m.userId === lastThrowForTeam.userId)
              memberIdx = lastMemberIdx >= 0
                ? (lastMemberIdx + 1) % actualMemberCount
                : 0
            } else {
              memberIdx = 0
            }
            const member = actualMembers[memberIdx]
            currentCell = {
              rowIndex: rowIndex + 1,
              teamId: col.teamId,
              userId: member?.userId ?? '',
            }
            break
          }
          targetTurnNumber++
        }
      }
    }

    // === 順位 ===
    const totals = columns.map((col) => ({
      teamId: col.teamId,
      teamName: col.teamName,
      totalScore: cumulativeByTeam.get(col.teamId) ?? 0,
      isDisqualified: col.isDisqualified,
      isWinner: col.isWinner,
    }))

    const sortedForRank = [...totals].sort((a, b) => {
      // 失格は最下位
      if (a.isDisqualified && !b.isDisqualified) return 1
      if (!a.isDisqualified && b.isDisqualified) return -1
      // 勝者が最上位
      if (a.isWinner && !b.isWinner) return -1
      if (!a.isWinner && b.isWinner) return 1
      // 残りは得点降順
      return b.totalScore - a.totalScore
    })

    const rankings: TeamRanking[] = sortedForRank.map((t, i) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      totalScore: t.totalScore,
      rank: i + 1,
      isDisqualified: t.isDisqualified,
    }))

    return {
      columns,
      rows,
      currentCell,
      rankings,
      isFinished: match.status === 'FINISHED' || winnerTeams.size > 0,
      isFirstThrow: turnThrows.length === 0,
    }
  }, [match])
}

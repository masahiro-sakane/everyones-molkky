import { db } from '@/lib/db'
import { recordThrowSchema } from '@/lib/validation'
import { processThrow } from '@/lib/scoring'
import type { z } from 'zod'

export type RecordThrowInput = z.infer<typeof recordThrowSchema>

export async function recordThrow(shareCode: string, input: RecordThrowInput) {
  const validated = recordThrowSchema.parse(input)

  return db.$transaction(async (tx) => {
    // 試合を取得
    const match = await tx.match.findUnique({
      where: { shareCode },
      include: {
        matchTeams: { orderBy: { order: 'asc' } },
        sets: {
          where: { status: 'IN_PROGRESS' },
          orderBy: { setNumber: 'desc' },
          take: 1,
          include: {
            turns: {
              orderBy: { turnNumber: 'desc' },
              take: 1,
              include: {
                throws: { orderBy: { throwOrder: 'desc' }, take: 1 },
              },
            },
            // ターン数カウント用に全ターン数を取得
            _count: { select: { turns: true } },
          },
        },
      },
    })

    if (!match) throw new Error('試合が見つかりません')
    if (match.status !== 'IN_PROGRESS') throw new Error('試合は進行中ではありません')

    const currentSet = match.sets[0]
    if (!currentSet) throw new Error('進行中のセットがありません')

    const currentTurn = currentSet.turns[0]
    if (!currentTurn) throw new Error('進行中のターンがありません')

    // 現在のターンにある最後の投擲順を取得
    const lastThrow = currentTurn.throws[0]
    const nextThrowOrder = lastThrow ? lastThrow.throwOrder + 1 : 1

    // 現在のチームスコアを取得
    const teamScore = await tx.teamSetScore.findUniqueOrThrow({
      where: { setId_teamId: { setId: currentSet.id, teamId: validated.teamId } },
    })

    // スコア計算
    const throwResult = processThrow({
      currentScore: teamScore.totalScore,
      consecutiveMisses: teamScore.consecutiveMisses,
      throwInput: {
        skittlesKnocked: validated.skittlesKnocked,
        faultType: validated.faultType ?? null,
      },
    })

    // 投擲を記録
    const newThrow = await tx.throw.create({
      data: {
        turnId: currentTurn.id,
        userId: validated.userId,
        teamId: validated.teamId,
        throwOrder: nextThrowOrder,
        skittlesKnocked: validated.skittlesKnocked,
        score: throwResult.score,
        isFault: throwResult.isFault,
        faultType: throwResult.faultType,
      },
      include: { user: true },
    })

    // チームスコアを更新
    await tx.teamSetScore.update({
      where: { setId_teamId: { setId: currentSet.id, teamId: validated.teamId } },
      data: {
        totalScore: throwResult.totalScore,
        consecutiveMisses: throwResult.consecutiveMisses,
        isDisqualified: throwResult.isDisqualified,
      },
    })

    // 全チームのスコアを取得（失格チーム判定用）
    const allTeamScores = await tx.teamSetScore.findMany({
      where: { setId: currentSet.id },
    })

    // 失格していないチームの一覧
    const activeTeams = allTeamScores.filter((s) => !s.isDisqualified)

    // 勝利判定：50点到達、または失格していないチームが1つのみ残った場合
    const lastTeamStanding =
      !throwResult.isWinner && activeTeams.length === 1
        ? activeTeams[0]
        : null
    const winnerId = throwResult.isWinner
      ? validated.teamId
      : lastTeamStanding?.teamId ?? null

    // 制限超過チェック（通常勝利がない場合のみ）
    let limitWinnerId: string | null = null
    if (!winnerId) {
      const teamCount = match.matchTeams.length
      const completedRounds = Math.floor(currentTurn.turnNumber / teamCount)

      // ターン制限チェック：1ラウンド（全チームが1回ずつ投擲）完了後に判定
      if (
        match.limitType === 'TURNS' &&
        match.turnLimit !== null &&
        match.turnLimit !== undefined &&
        currentTurn.turnNumber % teamCount === 0 &&
        completedRounds >= match.turnLimit
      ) {
        const activeScores = allTeamScores.filter((s) => !s.isDisqualified)
        const maxScore = Math.max(...activeScores.map((s) => s.totalScore))
        const topTeams = activeScores.filter((s) => s.totalScore === maxScore)
        if (topTeams.length === 1) {
          limitWinnerId = topTeams[0].teamId
        }
        // 同点の場合は継続（limitWinnerIdはnullのまま）
      }

      // 時間制限チェック
      if (
        match.limitType === 'TIME' &&
        match.timeLimitMinutes !== null &&
        match.timeLimitMinutes !== undefined &&
        match.startedAt !== null &&
        match.startedAt !== undefined &&
        currentTurn.turnNumber % teamCount === 0 // ラウンドの最後に判定
      ) {
        const elapsedMs = Date.now() - new Date(match.startedAt).getTime()
        const elapsedMinutes = elapsedMs / 1000 / 60
        if (elapsedMinutes >= match.timeLimitMinutes) {
          const activeScores = allTeamScores.filter((s) => !s.isDisqualified)
          const maxScore = Math.max(...activeScores.map((s) => s.totalScore))
          const topTeams = activeScores.filter((s) => s.totalScore === maxScore)
          if (topTeams.length === 1) {
            limitWinnerId = topTeams[0].teamId
          }
        }
      }
    }

    const finalWinnerId = winnerId ?? limitWinnerId

    if (finalWinnerId) {
      await tx.set.update({
        where: { id: currentSet.id },
        data: { status: 'FINISHED', winnerId: finalWinnerId },
      })
      await tx.match.update({
        where: { id: match.id },
        data: { status: 'FINISHED' },
      })
    } else {
      // 試合継続：失格チームをスキップして次のターンを作成
      const teamCount = match.matchTeams.length
      let nextTurnNumber = currentTurn.turnNumber + 1

      // 失格チームをスキップ（最大でも全チーム数分だけループ）
      for (let i = 0; i < teamCount; i++) {
        const teamIndex = (nextTurnNumber - 1) % teamCount
        const nextMatchTeam = match.matchTeams.find((mt) => mt.order === teamIndex + 1)
        const nextTeamScore = allTeamScores.find((s) => s.teamId === nextMatchTeam?.teamId)
        if (!nextTeamScore?.isDisqualified) break
        nextTurnNumber++
      }

      await tx.turn.create({
        data: { setId: currentSet.id, turnNumber: nextTurnNumber },
      })
    }

    return {
      throw: newThrow,
      result: throwResult,
    }
  })
}

export async function getThrowHistory(shareCode: string) {
  const match = await db.match.findUnique({
    where: { shareCode },
    include: {
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
        },
      },
    },
  })

  if (!match) throw new Error('試合が見つかりません')
  return match
}

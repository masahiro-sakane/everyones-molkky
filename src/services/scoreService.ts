import { db } from '@/lib/db'
import { recordThrowSchema, updateThrowSchema } from '@/lib/validation'
import { processThrow, calculateThrowScore } from '@/lib/scoring'
import type { z } from 'zod'

export type RecordThrowInput = z.infer<typeof recordThrowSchema>

export async function recordThrow(shareCode: string, input: RecordThrowInput) {
  const validated = recordThrowSchema.parse(input)

  return db.$transaction(async (tx) => {
    // 試合・セット・ターン・全チームスコアを1クエリで取得（round-trip削減）
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
            teamSetScores: true,
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

    // turnNumber からこのターンの担当チームを検証する
    const teamCount = match.matchTeams.length
    const expectedTeamIndex = (currentTurn.turnNumber - 1) % teamCount
    const expectedMatchTeam = match.matchTeams.find((mt) => mt.order === expectedTeamIndex + 1)
    if (!expectedMatchTeam || expectedMatchTeam.teamId !== validated.teamId) {
      throw new Error('投擲順序が正しくありません')
    }

    // 現在のターンにある最後の投擲順を取得
    const lastThrow = currentTurn.throws[0]
    const nextThrowOrder = lastThrow ? lastThrow.throwOrder + 1 : 1

    // 既にincludeした teamSetScores から現在チームのスコアを取得（追加クエリ不要）
    const allTeamScores = currentSet.teamSetScores
    const teamScore = allTeamScores.find((s) => s.teamId === validated.teamId)
    if (!teamScore) throw new Error('チームスコアが見つかりません')

    // スコア計算
    const throwResult = processThrow({
      currentScore: teamScore.totalScore,
      consecutiveMisses: teamScore.consecutiveMisses,
      throwInput: {
        skittlesKnocked: validated.skittlesKnocked,
        faultType: validated.faultType ?? null,
      },
    })

    // 投擲記録とチームスコア更新を並列実行
    const [newThrow] = await Promise.all([
      tx.throw.create({
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
      }),
      tx.teamSetScore.update({
        where: { setId_teamId: { setId: currentSet.id, teamId: validated.teamId } },
        data: {
          totalScore: throwResult.totalScore,
          consecutiveMisses: throwResult.consecutiveMisses,
          isDisqualified: throwResult.isDisqualified,
        },
      }),
    ])

    // 更新後のスコアを計算（メモリ内で）
    const updatedTeamScores = allTeamScores.map((s) =>
      s.teamId === validated.teamId
        ? { ...s, totalScore: throwResult.totalScore, consecutiveMisses: throwResult.consecutiveMisses, isDisqualified: throwResult.isDisqualified }
        : s
    )

    // 失格していないチームの一覧
    const activeTeams = updatedTeamScores.filter((s) => !s.isDisqualified)

    // 勝利判定：
    // - 50点到達 → 投擲チームが勝者
    // - 残り1チーム → そのチームが勝者
    // - 全チーム失格（残り0チーム）→ 最高得点チームが勝者（同点は winnerId=null で引き分け扱い）
    let winnerId: string | null = null
    if (throwResult.isWinner) {
      winnerId = validated.teamId
    } else if (activeTeams.length === 1) {
      winnerId = activeTeams[0].teamId
    } else if (activeTeams.length === 0) {
      // 全チーム失格：最高得点チームを勝者とする
      const maxScore = Math.max(...updatedTeamScores.map((s) => s.totalScore))
      const topTeams = updatedTeamScores.filter((s) => s.totalScore === maxScore)
      if (topTeams.length === 1) {
        winnerId = topTeams[0].teamId
      } else {
        // 同点の場合は最後に投擲したチームを便宜上の勝者とする
        winnerId = validated.teamId
      }
    }

    // 制限超過チェック（通常勝利がない場合のみ）
    let limitWinnerId: string | null = null
    if (!winnerId) {
      const completedRounds = Math.floor(currentTurn.turnNumber / teamCount)

      // ターン制限チェック：1ラウンド（全チームが1回ずつ投擲）完了後に判定
      if (
        match.limitType === 'TURNS' &&
        match.turnLimit !== null &&
        match.turnLimit !== undefined &&
        currentTurn.turnNumber % teamCount === 0 &&
        completedRounds >= match.turnLimit
      ) {
        // 失格していないチームを優先、全員失格なら全チームを対象にする
        const scorePool = updatedTeamScores.filter((s) => !s.isDisqualified)
        const candidates = scorePool.length > 0 ? scorePool : updatedTeamScores
        if (candidates.length > 0) {
          const maxScore = Math.max(...candidates.map((s) => s.totalScore))
          const topTeams = candidates.filter((s) => s.totalScore === maxScore)
          limitWinnerId = topTeams.length === 1 ? topTeams[0].teamId : validated.teamId
        }
      }

      // 時間制限チェック
      if (
        match.limitType === 'TIME' &&
        match.timeLimitMinutes !== null &&
        match.timeLimitMinutes !== undefined &&
        match.startedAt !== null &&
        match.startedAt !== undefined &&
        currentTurn.turnNumber % teamCount === 0
      ) {
        const elapsedMs = Date.now() - new Date(match.startedAt).getTime()
        const elapsedMinutes = elapsedMs / 1000 / 60
        if (elapsedMinutes >= match.timeLimitMinutes) {
          const scorePool = updatedTeamScores.filter((s) => !s.isDisqualified)
          const candidates = scorePool.length > 0 ? scorePool : updatedTeamScores
          if (candidates.length > 0) {
            const maxScore = Math.max(...candidates.map((s) => s.totalScore))
            const topTeams = candidates.filter((s) => s.totalScore === maxScore)
            limitWinnerId = topTeams.length === 1 ? topTeams[0].teamId : validated.teamId
          }
        }
      }
    }

    const finalWinnerId = winnerId ?? limitWinnerId

    if (finalWinnerId) {
      // 更新前に既にFINISHEDのセット数を取得（更新後のカウントは反映タイミングが不安定）
      const alreadyFinishedCount = await tx.set.count({
        where: { matchId: match.id, status: 'FINISHED' },
      })

      // セットを終了
      await tx.set.update({
        where: { id: currentSet.id },
        data: { status: 'FINISHED', winnerId: finalWinnerId },
      })

      // 今終了したセットを含めた完了セット数
      const finishedSetsCount = alreadyFinishedCount + 1

      if (finishedSetsCount >= match.totalSets) {
        await tx.match.update({
          where: { id: match.id },
          data: { status: 'FINISHED' },
        })
      }
    } else {
      // 試合継続：失格チームをスキップして次のターンを作成
      let nextTurnNumber = currentTurn.turnNumber + 1
      let foundActive = false

      // 失格チームをスキップ（最大でも全チーム数分だけループ）
      for (let i = 0; i < teamCount; i++) {
        const teamIndex = (nextTurnNumber - 1) % teamCount
        const nextMatchTeam = match.matchTeams.find((mt) => mt.order === teamIndex + 1)
        const nextTeamScore = updatedTeamScores.find((s) => s.teamId === nextMatchTeam?.teamId)
        if (!nextTeamScore?.isDisqualified) {
          foundActive = true
          break
        }
        nextTurnNumber++
      }

      // アクティブなチームが存在する場合のみ次ターンを作成
      // （全員失格は winnerId 確定済みで通常ここには来ないが安全のため）
      if (foundActive) {
        await tx.turn.create({
          data: { setId: currentSet.id, turnNumber: nextTurnNumber },
        })
      }
    }

    return {
      throw: newThrow,
      result: throwResult,
    }
  })
}

export type UpdateThrowInput = z.infer<typeof updateThrowSchema>

/**
 * 投擲記録を修正し、そのチームの teamSetScore を全投擲から再計算して更新する。
 * 再計算は「そのセット内のそのチームの全投擲を時系列順にシミュレート」して行う。
 */
export async function updateThrow(shareCode: string, throwId: string, input: UpdateThrowInput) {
  const validated = updateThrowSchema.parse(input)

  return db.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { shareCode },
      include: { sets: { where: { status: 'IN_PROGRESS' }, take: 1 } },
    })
    if (!match) throw new Error('試合が見つかりません')
    if (match.status !== 'IN_PROGRESS') throw new Error('試合は進行中ではありません')

    const currentSet = match.sets[0]
    if (!currentSet) throw new Error('進行中のセットがありません')

    // 対象の投擲を取得
    const targetThrow = await tx.throw.findUnique({ where: { id: throwId } })
    if (!targetThrow) throw new Error('投擲が見つかりません')

    const newScore = calculateThrowScore(validated.skittlesKnocked)

    // 投擲レコードを更新
    await tx.throw.update({
      where: { id: throwId },
      data: {
        skittlesKnocked: validated.skittlesKnocked,
        score: newScore,
        isFault: false,
        faultType: null,
      },
    })

    // そのチームの全投擲を時系列順に再取得してスコアを再計算
    const allThrows = await tx.throw.findMany({
      where: { turn: { setId: currentSet.id }, teamId: targetThrow.teamId },
      orderBy: [{ turn: { turnNumber: 'asc' } }, { throwOrder: 'asc' }],
    })

    let totalScore = 0
    let consecutiveMisses = 0
    let isDisqualified = false

    for (const t of allThrows) {
      const result = processThrow({
        currentScore: totalScore,
        consecutiveMisses,
        throwInput: {
          skittlesKnocked: t.skittlesKnocked,
          faultType: t.faultType as Parameters<typeof processThrow>[0]['throwInput']['faultType'],
        },
      })
      totalScore = result.totalScore
      consecutiveMisses = result.consecutiveMisses
      isDisqualified = result.isDisqualified
      if (result.isWinner) break
    }

    await tx.teamSetScore.update({
      where: { setId_teamId: { setId: currentSet.id, teamId: targetThrow.teamId } },
      data: { totalScore, consecutiveMisses, isDisqualified },
    })
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

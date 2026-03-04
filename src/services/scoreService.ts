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

    // 勝利判定
    if (throwResult.isWinner) {
      await tx.set.update({
        where: { id: currentSet.id },
        data: { status: 'FINISHED', winnerId: validated.teamId },
      })
      await tx.match.update({
        where: { id: match.id },
        data: { status: 'FINISHED' },
      })
    } else {
      // 試合継続：次のターンを作成して投擲者を切り替える
      await tx.turn.create({
        data: { setId: currentSet.id, turnNumber: currentTurn.turnNumber + 1 },
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

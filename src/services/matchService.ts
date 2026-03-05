import { db } from '@/lib/db'
import { createMatchSchema } from '@/lib/validation'
import type { z } from 'zod'

export type CreateMatchInput = z.infer<typeof createMatchSchema>

export async function createMatch(input: CreateMatchInput) {
  const validated = createMatchSchema.parse(input)

  return db.$transaction(async (tx) => {
    const limitType = validated.limitType ?? 'NONE'

    // 試合を作成
    const match = await tx.match.create({
      data: {
        status: 'WAITING',
        limitType,
        turnLimit: limitType === 'TURNS' ? (validated.turnLimit ?? 12) : null,
        timeLimitMinutes: limitType === 'TIME' ? (validated.timeLimitMinutes ?? 20) : null,
      },
    })

    // 参加チームを登録（投擲順は入力順、メンバー順は指定があれば使用）
    await tx.matchTeam.createMany({
      data: validated.teamIds.map((teamId, index) => ({
        matchId: match.id,
        teamId,
        order: index + 1,
        memberOrder: validated.memberOrders?.[teamId] ?? [],
      })),
    })

    // 第1セットを作成
    const set = await tx.set.create({
      data: { matchId: match.id, setNumber: 1 },
    })

    // 各チームの初期スコアレコードを作成
    await tx.teamSetScore.createMany({
      data: validated.teamIds.map((teamId) => ({
        setId: set.id,
        teamId,
        totalScore: 0,
        consecutiveMisses: 0,
        isDisqualified: false,
      })),
    })

    // 第1ターンを作成
    await tx.turn.create({
      data: { setId: set.id, turnNumber: 1 },
    })

    // ステータスをIN_PROGRESSに更新
    return tx.match.update({
      where: { id: match.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      include: {
        matchTeams: { include: { team: true }, orderBy: { order: 'asc' } },
        sets: {
          include: {
            turns: { include: { throws: true } },
          },
        },
      },
    })
  })
}

export async function getMatchByShareCode(shareCode: string) {
  return db.match.findUnique({
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
        },
      },
    },
  })
}

export async function getMatchById(id: string) {
  return db.match.findUnique({
    where: { id },
    include: {
      matchTeams: { include: { team: true }, orderBy: { order: 'asc' } },
      sets: {
        orderBy: { setNumber: 'asc' },
        include: {
          turns: {
            orderBy: { turnNumber: 'asc' },
            include: { throws: { orderBy: { throwOrder: 'asc' } } },
          },
        },
      },
    },
  })
}

export async function listMatches() {
  return db.match.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      matchTeams: { include: { team: true }, orderBy: { order: 'asc' } },
    },
  })
}

export async function finishMatch(matchId: string) {
  return db.match.update({
    where: { id: matchId },
    data: { status: 'FINISHED' },
  })
}

export async function deleteMatch(matchId: string) {
  return db.match.delete({ where: { id: matchId } })
}

export async function getTeamSetScores(setId: string) {
  return db.teamSetScore.findMany({
    where: { setId },
  })
}

export async function getMatchWithScores(shareCode: string) {
  const match = await db.match.findUnique({
    where: { shareCode },
    include: {
      matchTeams: {
        include: { team: { include: { members: { include: { user: true } } } } },
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
  return match
}

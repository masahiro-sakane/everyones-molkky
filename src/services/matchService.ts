import { db } from '@/lib/db'
import { createMatchSchema, createSoloMatchSchema } from '@/lib/validation'
import type { z } from 'zod'

export type CreateMatchInput = z.infer<typeof createMatchSchema>
export type CreateSoloMatchInput = z.infer<typeof createSoloMatchSchema>

export async function createMatch(input: CreateMatchInput) {
  const validated = createMatchSchema.parse(input)

  return db.$transaction(async (tx) => {
    const limitType = validated.limitType ?? 'NONE'

    // 試合を作成
    const match = await tx.match.create({
      data: {
        status: 'WAITING',
        matchType: 'TEAM',
        limitType,
        turnLimit: limitType === 'TURNS' ? (validated.turnLimit ?? 12) : null,
        timeLimitMinutes: limitType === 'TIME' ? (validated.timeLimitMinutes ?? 20) : null,
        totalSets: validated.totalSets ?? 1,
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

export async function createSoloMatch(input: CreateSoloMatchInput) {
  const validated = createSoloMatchSchema.parse(input)

  // 参加プレイヤーをDBから取得
  const players = await db.user.findMany({
    where: { id: { in: validated.playerIds } },
  })
  if (players.length !== validated.playerIds.length) {
    throw new Error('存在しないプレイヤーが含まれています')
  }

  return db.$transaction(async (tx) => {
    const limitType = validated.limitType ?? 'NONE'

    // 試合を作成
    const match = await tx.match.create({
      data: {
        status: 'WAITING',
        matchType: 'SOLO',
        limitType,
        turnLimit: limitType === 'TURNS' ? (validated.turnLimit ?? 12) : null,
        timeLimitMinutes: limitType === 'TIME' ? (validated.timeLimitMinutes ?? 20) : null,
        totalSets: validated.totalSets ?? 1,
      },
    })

    // 参加プレイヤーごとに1人チームを自動生成して登録
    const teamIds: string[] = []
    for (const [index, playerId] of validated.playerIds.entries()) {
      const player = players.find((p) => p.id === playerId)!
      const soloTeam = await tx.team.create({
        data: {
          name: player.name,
          isSolo: true,
          members: {
            create: { userId: playerId, role: 'captain' },
          },
        },
      })
      await tx.matchTeam.create({
        data: {
          matchId: match.id,
          teamId: soloTeam.id,
          order: index + 1,
          memberOrder: [playerId],
        },
      })
      teamIds.push(soloTeam.id)
    }

    // 第1セットを作成
    const set = await tx.set.create({
      data: { matchId: match.id, setNumber: 1 },
    })

    // 各プレイヤー（チーム）の初期スコアレコードを作成
    await tx.teamSetScore.createMany({
      data: teamIds.map((teamId) => ({
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
        include: {
          team: { include: { members: { include: { user: true }, orderBy: { joinedAt: 'asc' } } } },
        },
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

/**
 * 次のゲーム（セット）を開始する。
 * - チームの投擲順（order）を逆順にする
 * - 各チームのメンバー投擲順（memberOrder）を逆順にする
 * - 新セットの TeamSetScore と Turn#1 を作成する
 */
export async function startNextSet(shareCode: string) {
  return db.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { shareCode },
      include: {
        matchTeams: { orderBy: { order: 'asc' } },
        sets: { orderBy: { setNumber: 'desc' }, take: 1 },
      },
    })
    if (!match) throw new Error('試合が見つかりません')

    const lastSet = match.sets[0]
    if (!lastSet || lastSet.status !== 'FINISHED') {
      throw new Error('現在のゲームがまだ完了していません')
    }

    const nextSetNumber = lastSet.setNumber + 1
    if (nextSetNumber > match.totalSets) {
      throw new Error('全ゲームが完了しています')
    }

    const teamCount = match.matchTeams.length

    // チーム投擲順を逆順に更新（order 1→N, 2→N-1, ...）
    // 一時的に負の値にしてからセットすることで unique 制約違反を回避
    for (const mt of match.matchTeams) {
      await tx.matchTeam.update({
        where: { id: mt.id },
        data: { order: -(mt.order) },
      })
    }
    for (const mt of match.matchTeams) {
      const newOrder = teamCount + 1 - mt.order
      const newMemberOrder = [...mt.memberOrder].reverse()
      await tx.matchTeam.update({
        where: { id: mt.id },
        data: { order: newOrder, memberOrder: newMemberOrder },
      })
    }

    // 新セット作成
    const newSet = await tx.set.create({
      data: { matchId: match.id, setNumber: nextSetNumber },
    })

    // TeamSetScore 初期化
    await tx.teamSetScore.createMany({
      data: match.matchTeams.map((mt) => ({
        setId: newSet.id,
        teamId: mt.teamId,
        totalScore: 0,
        consecutiveMisses: 0,
        isDisqualified: false,
      })),
    })

    // Turn#1 作成
    await tx.turn.create({
      data: { setId: newSet.id, turnNumber: 1 },
    })

    return newSet
  })
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
        include: { team: { include: { members: { include: { user: true }, orderBy: { joinedAt: 'asc' } } } } },
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

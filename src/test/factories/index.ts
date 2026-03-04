import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// テスト用DBクライアント（テスト内で直接使用）
export function createTestDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return { db: new PrismaClient({ adapter }), pool }
}

export async function createTestUser(
  db: PrismaClient,
  overrides?: Partial<{ name: string; avatarUrl: string }>
) {
  return db.user.create({
    data: {
      name: overrides?.name ?? `テストユーザー_${Date.now()}`,
      avatarUrl: overrides?.avatarUrl ?? null,
    },
  })
}

export async function createTestTeam(
  db: PrismaClient,
  overrides?: Partial<{ name: string }>
) {
  return db.team.create({
    data: { name: overrides?.name ?? `テストチーム_${Date.now()}` },
  })
}

export async function createTestMatch(
  db: PrismaClient,
  teamIds: string[]
) {
  const match = await db.match.create({
    data: { status: 'IN_PROGRESS' },
  })

  await db.matchTeam.createMany({
    data: teamIds.map((teamId, index) => ({
      matchId: match.id,
      teamId,
      order: index + 1,
    })),
  })

  const set = await db.set.create({
    data: { matchId: match.id, setNumber: 1 },
  })

  await db.teamSetScore.createMany({
    data: teamIds.map((teamId) => ({
      setId: set.id,
      teamId,
      totalScore: 0,
      consecutiveMisses: 0,
      isDisqualified: false,
    })),
  })

  await db.turn.create({
    data: { setId: set.id, turnNumber: 1 },
  })

  return db.match.findUniqueOrThrow({
    where: { id: match.id },
    include: {
      matchTeams: { include: { team: true } },
      sets: { include: { turns: true } },
    },
  })
}

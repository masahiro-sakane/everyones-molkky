import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  console.log('シードデータを投入中...')

  // ユーザーを作成
  const users = await Promise.all([
    db.user.upsert({ where: { id: 'seed-user-1' }, update: {}, create: { id: 'seed-user-1', name: '田中 太郎' } }),
    db.user.upsert({ where: { id: 'seed-user-2' }, update: {}, create: { id: 'seed-user-2', name: '鈴木 花子' } }),
    db.user.upsert({ where: { id: 'seed-user-3' }, update: {}, create: { id: 'seed-user-3', name: '佐藤 一郎' } }),
    db.user.upsert({ where: { id: 'seed-user-4' }, update: {}, create: { id: 'seed-user-4', name: '山田 二郎' } }),
    db.user.upsert({ where: { id: 'seed-user-5' }, update: {}, create: { id: 'seed-user-5', name: '高橋 三郎' } }),
    db.user.upsert({ where: { id: 'seed-user-6' }, update: {}, create: { id: 'seed-user-6', name: '伊藤 四郎' } }),
  ])
  console.log(`ユーザー ${users.length} 件作成`)

  // チームAを作成
  const teamA = await db.team.upsert({
    where: { id: 'seed-team-a' },
    update: {},
    create: { id: 'seed-team-a', name: 'チームA' },
  })

  // チームBを作成
  const teamB = await db.team.upsert({
    where: { id: 'seed-team-b' },
    update: {},
    create: { id: 'seed-team-b', name: 'チームB' },
  })

  // チームAにメンバーを追加
  await Promise.all(
    ['seed-user-1', 'seed-user-2', 'seed-user-3'].map((userId, index) =>
      db.teamMember.upsert({
        where: { teamId_userId: { teamId: teamA.id, userId } },
        update: {},
        create: {
          teamId: teamA.id,
          userId,
          role: index === 0 ? 'captain' : 'member',
        },
      })
    )
  )

  // チームBにメンバーを追加
  await Promise.all(
    ['seed-user-4', 'seed-user-5', 'seed-user-6'].map((userId, index) =>
      db.teamMember.upsert({
        where: { teamId_userId: { teamId: teamB.id, userId } },
        update: {},
        create: {
          teamId: teamB.id,
          userId,
          role: index === 0 ? 'captain' : 'member',
        },
      })
    )
  )

  console.log(`チーム作成: ${teamA.name}, ${teamB.name}`)
  console.log('シードデータ投入完了!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
    await pool.end()
  })

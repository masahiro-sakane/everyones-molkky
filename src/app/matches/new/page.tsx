import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CreateMatchForm } from '@/components/match/CreateMatchForm'
import { listTeams } from '@/services/teamService'
import { listUsers } from '@/services/userService'

export const dynamic = 'force-dynamic'

export default async function NewMatchPage() {
  const [teams, users] = await Promise.all([listTeams(), listUsers()])

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            ← ホームへ
          </Link>
          <h1 className="text-xl font-bold text-neutral-900 mt-2">試合を作成</h1>
        </div>

        <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-6 shadow-sm">
          <CreateMatchForm teams={teams} users={users} />
        </div>
      </div>
    </AppLayout>
  )
}

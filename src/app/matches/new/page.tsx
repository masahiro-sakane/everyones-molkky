import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CreateMatchForm } from '@/components/match/CreateMatchForm'
import { listTeams } from '@/services/teamService'

export const dynamic = 'force-dynamic'

export default async function NewMatchPage() {
  const teams = await listTeams()

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
          <p className="text-sm text-neutral-500 mt-1">
            参加チームを選んで試合を開始します。選択した順番が投擲順になります。
          </p>
        </div>

        <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-6 shadow-sm">
          <CreateMatchForm teams={teams} />
        </div>
      </div>
    </AppLayout>
  )
}

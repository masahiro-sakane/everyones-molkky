import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CreateTeamForm } from '@/components/team/CreateTeamForm'

export default function NewTeamPage() {
  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link
            href="/teams"
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            ← チーム一覧へ
          </Link>
          <h1 className="text-xl font-bold text-neutral-900 mt-2">チームを作成</h1>
          <p className="text-sm text-neutral-500 mt-1">
            チーム名を入力してチームを作成します。メンバーはあとから追加できます。
          </p>
        </div>

        <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-6 shadow-sm">
          <CreateTeamForm />
        </div>
      </div>
    </AppLayout>
  )
}

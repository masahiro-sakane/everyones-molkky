import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/Badge'
import { MemberList } from '@/components/team/MemberList'
import { getTeamById } from '@/services/teamService'
import { listUsers } from '@/services/userService'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params
  const [team, allUsers] = await Promise.all([getTeamById(id), listUsers()])

  if (!team) {
    notFound()
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/teams"
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            ← チーム一覧へ
          </Link>
        </div>

        <div className="bg-neutral-0 border border-neutral-300 rounded-lg shadow-sm mb-6">
          <div className="px-6 py-5 border-b border-neutral-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-neutral-900">{team.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default">{team.members.length}人のメンバー</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <MemberList
              teamId={team.id}
              members={team.members}
              allUsers={allUsers}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardTitle } from '@/components/ui/Card'
import { listTeams } from '@/services/teamService'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'チーム管理',
  description: 'チームの作成・メンバー管理ができます。',
}

export default async function TeamsPage() {
  const teams = await listTeams()

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-neutral-900">チーム一覧</h1>
        <Button variant="primary" size="md">
          <Link href="/teams/new">チームを作成</Link>
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-neutral-500 mb-4">まだチームがありません。</p>
          <Link href="/teams/new">
            <Button variant="primary">最初のチームを作成</Button>
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <li key={team.id}>
              <Link href={`/teams/${team.id}`} className="block h-full">
                <Card padding="none" className="h-full hover:border-brand-400 hover:shadow-md transition-all cursor-pointer">
                  <div className="px-4 pt-4 pb-3 border-b border-neutral-200">
                    <CardTitle>{team.name}</CardTitle>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{team.members.length}人</Badge>
                      {team.members.length === 0 && (
                        <span className="text-xs text-neutral-400">メンバーなし</span>
                      )}
                    </div>
                    {team.members.length > 0 && (
                      <p className="mt-2 text-xs text-neutral-500 truncate">
                        {team.members.map((m) => m.user.name).join('、')}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  )
}

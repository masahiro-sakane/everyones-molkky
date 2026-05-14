import { AppLayout } from '@/components/layout/AppLayout'
import { CreateMatchForm } from '@/components/match/CreateMatchForm'
import { listTeams } from '@/services/teamService'
import { listUsers } from '@/services/userService'

export const dynamic = 'force-dynamic'

export default async function NewMatchPage() {
  const [teams, users] = await Promise.all([listTeams(), listUsers()])

  return (
    <AppLayout>
      <div className="max-w-lg md:max-w-4xl mx-auto">
        <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-6 shadow-sm">
          <CreateMatchForm teams={teams} users={users} />
        </div>
      </div>
    </AppLayout>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type TeamScore = {
  teamId: string
  teamName: string
  totalScore: number
  isDisqualified: boolean
}

type WinnerBannerProps = {
  winnerTeamId: string
  teams: TeamScore[]
  shareCode: string
}

export function WinnerBanner({ winnerTeamId, teams, shareCode }: WinnerBannerProps) {
  const winner = teams.find((t) => t.teamId === winnerTeamId)
  const others = teams
    .filter((t) => t.teamId !== winnerTeamId)
    .sort((a, b) => b.totalScore - a.totalScore)

  return (
    <div
      className="bg-success-50 border border-success-300 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      data-testid="winner-banner"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 text-2xl">🏆</div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-success-600">試合終了</p>
          <p className="text-base font-bold text-neutral-900 truncate">
            {winner?.teamName ?? '???'} の勝利！
            <span className="ml-2 text-success-600 tabular-nums">{winner?.totalScore ?? 0}点</span>
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {others.map((team, i) => (
              <span key={team.teamId} className="text-xs text-neutral-500">
                <Badge variant="default">{i + 2}位</Badge>
                <span className="ml-1">{team.teamName}</span>
                <span className="ml-1 tabular-nums">{team.totalScore}点</span>
                {team.isDisqualified && <Badge variant="danger" className="ml-1">失格</Badge>}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href="/matches/new">
          <Button variant="primary" size="sm">新しい試合</Button>
        </Link>
        <Link href="/teams">
          <Button variant="secondary" size="sm">チーム一覧</Button>
        </Link>
      </div>
    </div>
  )
}

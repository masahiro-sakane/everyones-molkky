import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type TeamScore = {
  teamId: string
  teamName: string
  totalScore: number
  isDisqualified: boolean
}

type MatchResultProps = {
  winnerTeamId: string
  teams: TeamScore[]
  shareCode: string
}

export function MatchResult({ winnerTeamId, teams, shareCode }: MatchResultProps) {
  const winner = teams.find((t) => t.teamId === winnerTeamId)
  const others = teams
    .filter((t) => t.teamId !== winnerTeamId)
    .sort((a, b) => b.totalScore - a.totalScore)

  return (
    <div className="flex flex-col items-center gap-6 py-8" data-testid="match-result">
      <div className="text-center">
        <p className="text-xs font-medium text-success-600 mb-1">試合終了</p>
        <h2 className="text-2xl font-bold text-neutral-900">
          {winner?.teamName ?? '???'} の勝利！
        </h2>
        <p className="text-4xl font-black text-success-600 mt-2 tabular-nums">
          {winner?.totalScore ?? 0}点
        </p>
      </div>

      {/* 最終スコア */}
      <div className="w-full max-w-sm bg-neutral-0 border border-neutral-300 rounded-lg divide-y divide-neutral-200">
        {/* Winner */}
        {winner && (
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">1位</Badge>
              <span className="font-semibold text-sm">{winner.teamName}</span>
            </div>
            <span className="font-bold tabular-nums">{winner.totalScore}点</span>
          </div>
        )}
        {/* Others */}
        {others.map((team, index) => (
          <div key={team.teamId} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="default">{index + 2}位</Badge>
              <span className="text-sm text-neutral-700">{team.teamName}</span>
              {team.isDisqualified && (
                <Badge variant="danger">失格</Badge>
              )}
            </div>
            <span className="tabular-nums text-sm text-neutral-600">{team.totalScore}点</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/matches/new">
          <Button variant="primary">新しい試合を作成</Button>
        </Link>
        <Link href="/teams">
          <Button variant="secondary">チーム一覧へ</Button>
        </Link>
      </div>
    </div>
  )
}

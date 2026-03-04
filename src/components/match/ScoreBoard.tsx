import type { TeamScore } from '@/types/score'
import { Badge } from '@/components/ui/Badge'

type ScoreBoardProps = {
  teams: TeamScore[]
  winningScore?: number
}

export function ScoreBoard({ teams, winningScore = 50 }: ScoreBoardProps) {
  return (
    <div className="grid gap-3" role="region" aria-label="スコアボード">
      {teams.map((team) => (
        <TeamScoreRow key={team.teamId} team={team} winningScore={winningScore} />
      ))}
    </div>
  )
}

type TeamScoreRowProps = {
  team: TeamScore
  winningScore: number
}

function TeamScoreRow({ team, winningScore }: TeamScoreRowProps) {
  const progress = Math.min((team.totalScore / winningScore) * 100, 100)
  const isCloseToWin = team.totalScore >= 40 && !team.isDisqualified

  return (
    <div
      className={[
        'bg-neutral-0 rounded-lg border p-4',
        team.isDisqualified ? 'border-danger-300 opacity-60' : 'border-neutral-300',
      ].join(' ')}
      aria-label={`${team.teamName}: ${team.totalScore}点`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-900">{team.teamName}</span>
          {team.isDisqualified && (
            <Badge variant="danger">失格</Badge>
          )}
          {isCloseToWin && (
            <Badge variant="warning">あと{winningScore - team.totalScore}点!</Badge>
          )}
          {team.consecutiveMisses > 0 && !team.isDisqualified && (
            <Badge variant="danger">
              連続ミス {team.consecutiveMisses}/3
            </Badge>
          )}
        </div>
        <span
          className={[
            'text-2xl font-bold tabular-nums',
            isCloseToWin ? 'text-warning-600' : 'text-neutral-900',
            team.isDisqualified ? 'text-neutral-400' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
        >
          {team.totalScore}
          <span className="text-sm font-normal text-neutral-500 ml-1">点</span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 bg-neutral-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={team.totalScore}
        aria-valuemin={0}
        aria-valuemax={winningScore}
        aria-label={`${team.teamName}の進捗`}
      >
        <div
          className={[
            'h-full rounded-full transition-all duration-500',
            team.isDisqualified
              ? 'bg-neutral-400'
              : isCloseToWin
              ? 'bg-warning-400'
              : 'bg-brand-500',
          ].join(' ')}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-neutral-400 mt-1">
        <span>0</span>
        <span>{winningScore}</span>
      </div>
    </div>
  )
}

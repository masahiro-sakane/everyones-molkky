import { Badge } from '@/components/ui/Badge'

const WIN_SCORE = 50

type TeamScore = {
  teamId: string
  teamName: string
  totalScore: number
  consecutiveMisses: number
  isDisqualified: boolean
  isWinner?: boolean
}

type LiveScoreBoardProps = {
  teams: TeamScore[]
  currentTeamId?: string
}

export function LiveScoreBoard({ teams, currentTeamId }: LiveScoreBoardProps) {
  const sorted = [...teams].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((team) => {
        const isCurrent = team.teamId === currentTeamId
        const progress = Math.min((team.totalScore / WIN_SCORE) * 100, 100)
        const isNearWin = team.totalScore >= 40 && !team.isDisqualified && !team.isWinner

        return (
          <div
            key={team.teamId}
            className={[
              'px-4 py-3 rounded-lg border transition-colors',
              isCurrent
                ? 'border-brand-400 bg-brand-50'
                : 'border-neutral-300 bg-neutral-0',
              team.isDisqualified ? 'opacity-60' : '',
            ].join(' ')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {isCurrent && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse shrink-0"
                    aria-label="投擲中"
                  />
                )}
                <span
                  className={[
                    'font-semibold text-sm truncate',
                    team.isDisqualified ? 'line-through text-neutral-400' : 'text-neutral-900',
                  ].join(' ')}
                >
                  {team.teamName}
                </span>
                {team.isWinner && <Badge variant="success">優勝</Badge>}
                {team.isDisqualified && <Badge variant="danger">失格</Badge>}
                {isNearWin && <Badge variant="warning">あと少し</Badge>}
              </div>
              <span
                className={[
                  'text-xl font-bold tabular-nums shrink-0',
                  team.isWinner ? 'text-success-600' : 'text-neutral-900',
                  team.isDisqualified ? 'text-neutral-400' : '',
                ].join(' ')}
              >
                {team.totalScore}
                <span className="text-xs font-normal text-neutral-400 ml-0.5">/ {WIN_SCORE}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="h-1.5 bg-neutral-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={team.totalScore}
              aria-valuemin={0}
              aria-valuemax={WIN_SCORE}
              aria-label={`${team.teamName}のスコア`}
            >
              <div
                className={[
                  'h-full rounded-full transition-all duration-300',
                  team.isWinner
                    ? 'bg-success-500'
                    : team.isDisqualified
                      ? 'bg-neutral-400'
                      : isNearWin
                        ? 'bg-warning-500'
                        : 'bg-brand-500',
                ].join(' ')}
                style={{ width: `${progress}%` }}
              />
            </div>

            {team.consecutiveMisses > 0 && !team.isDisqualified && (
              <p className="mt-1 text-xs text-warning-700">
                連続ミス: {team.consecutiveMisses} / 3
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

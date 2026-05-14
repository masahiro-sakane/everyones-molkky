type CurrentThrowerProps = {
  teamName: string
  throwerName: string
  teamOrder: number
  totalTeams: number
  nextTeamName?: string
  nextThrowerName?: string
}

export function CurrentThrower({
  teamName,
  throwerName,
  teamOrder,
  totalTeams,
  nextTeamName,
  nextThrowerName,
}: CurrentThrowerProps) {
  return (
    <div
      className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 flex items-center justify-between gap-3"
      data-testid="current-thrower"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded-full bg-brand-500 text-neutral-0 flex items-center justify-center text-sm font-bold shrink-0"
          aria-hidden="true"
        >
          {throwerName.charAt(0)}
        </div>
        <span className="text-xs text-brand-600 font-medium shrink-0">投擲者:</span>
        <span className="text-sm font-bold text-neutral-900 truncate">{throwerName}</span>
        {teamName && <span className="text-xs text-neutral-500 truncate">({teamName})</span>}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-400">
        <span>チーム {teamOrder} / {totalTeams}</span>
        {nextThrowerName && (
          <span>
            次: <span className="text-neutral-600">{nextThrowerName}</span>
            {nextTeamName && <span className="ml-0.5">({nextTeamName})</span>}
          </span>
        )}
      </div>
    </div>
  )
}

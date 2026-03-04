type CurrentThrowerProps = {
  teamName: string
  throwerName: string
  teamOrder: number
  totalTeams: number
}

export function CurrentThrower({
  teamName,
  throwerName,
  teamOrder,
  totalTeams,
}: CurrentThrowerProps) {
  return (
    <div
      className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4"
      data-testid="current-thrower"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full bg-brand-500 text-neutral-0 flex items-center justify-center text-base font-bold shrink-0"
          aria-hidden="true"
        >
          {throwerName.charAt(0)}
        </div>
        <div>
          <p className="text-xs text-brand-600 font-medium">現在の投擲者</p>
          <p className="text-sm font-bold text-neutral-900">{throwerName}</p>
          <p className="text-xs text-neutral-500">{teamName}</p>
        </div>
      </div>
      <div className="text-right text-xs text-neutral-400">
        チーム {teamOrder} / {totalTeams}
      </div>
    </div>
  )
}

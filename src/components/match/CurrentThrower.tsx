import type { ReactNode } from 'react'

type CurrentThrowerProps = {
  teamName: string
  throwerName: string
  teamOrder: number
  totalTeams: number
  nextTeamName?: string
  nextThrowerName?: string
  /** バーの右端に配置するアクション（AIボタンなど） */
  action?: ReactNode
}

export function CurrentThrower({
  teamName,
  throwerName,
  nextThrowerName,
  action,
}: CurrentThrowerProps) {
  return (
    <div
      className="bg-brand-500 rounded-lg px-3 py-1.5 flex items-center gap-2"
      data-testid="current-thrower"
    >
      {/* アイコン */}
      <div
        className="w-7 h-7 rounded-full bg-neutral-0/20 text-neutral-0 flex items-center justify-center text-sm font-bold shrink-0"
        aria-hidden="true"
      >
        {throwerName.charAt(0)}
      </div>

      {/* 現在の投擲者 */}
      <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
        <span className="text-sm font-bold text-neutral-0 truncate">{throwerName}</span>
        {teamName && (
          <span className="text-xs text-neutral-0/70 truncate shrink-0">({teamName})</span>
        )}
      </div>

      {/* 次の投擲者 */}
      {nextThrowerName && (
        <div className="flex items-center gap-1 shrink-0 text-xs text-neutral-0/70">
          <span>次:</span>
          <span className="text-neutral-0/90 font-medium">{nextThrowerName}</span>
        </div>
      )}

      {/* アクション（AIボタンなど） */}
      {action && <div className="shrink-0 ml-1">{action}</div>}
    </div>
  )
}

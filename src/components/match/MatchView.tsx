'use client'

import { useMatch, type MatchData } from '@/hooks/useMatch'
import { SheetMatchBoard } from './SheetMatchBoard'

type MatchViewProps = {
  match: MatchData
  watchMode?: boolean
}

export function MatchView({ match, watchMode = false }: MatchViewProps) {
  const { isFinished } = useMatch(match)
  const canDiscard = !watchMode && !isFinished

  return (
    <div className="flex flex-col gap-2">
      <SheetMatchBoard match={match} watchMode={watchMode} canDiscard={canDiscard} />
    </div>
  )
}

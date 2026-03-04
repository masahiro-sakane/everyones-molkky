'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMatch, type MatchData } from '@/hooks/useMatch'
import { useRealtimeScore } from '@/hooks/useRealtimeScore'
import { LiveScoreBoard } from './LiveScoreBoard'
import { CurrentThrower } from './CurrentThrower'
import { ThrowRecorder } from './ThrowRecorder'
import { ThrowHistory } from './ThrowHistory'
import { MatchResult } from './MatchResult'
import { DisqualificationAlert } from './DisqualificationAlert'
import { ShareButton } from './ShareButton'
import { ConnectionStatus } from './ConnectionStatus'

type MatchBoardProps = {
  match: MatchData
  /** 観戦モード（投擲入力を非表示） */
  watchMode?: boolean
}

export function MatchBoard({ match, watchMode = false }: MatchBoardProps) {
  const router = useRouter()

  const {
    teamScores,
    currentThrower,
    throwHistory,
    winnerTeamId,
    newlyDisqualifiedTeams,
    isFinished,
  } = useMatch(match)

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const handleRealtimeEvent = useCallback(() => {
    // SSE イベント受信時に Server Component を再レンダリング
    router.refresh()
  }, [router])

  const { status: connStatus } = useRealtimeScore({
    shareCode: match.shareCode,
    onEvent: handleRealtimeEvent,
  })

  const pendingAlerts = newlyDisqualifiedTeams.filter(
    (t) => !dismissedAlerts.has(t.teamId)
  )

  const dismissAlert = (teamId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, teamId]))
  }

  if (isFinished && winnerTeamId) {
    return (
      <MatchResult
        winnerTeamId={winnerTeamId}
        teams={teamScores}
        shareCode={match.shareCode}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 共有 & 接続状態 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-500 mb-1">試合を共有</p>
          <ShareButton shareCode={match.shareCode} />
        </div>
        <div className="shrink-0 pt-5">
          <ConnectionStatus status={connStatus} />
        </div>
      </div>

      {/* 失格アラート */}
      {pendingAlerts.map((team) => (
        <DisqualificationAlert
          key={team.teamId}
          teamName={team.teamName}
          onDismiss={() => dismissAlert(team.teamId)}
        />
      ))}

      {/* 現在の投擲者 */}
      {currentThrower && (
        <CurrentThrower
          teamName={currentThrower.teamName}
          throwerName={currentThrower.userName}
          teamOrder={currentThrower.teamOrder}
          totalTeams={currentThrower.totalTeams}
        />
      )}

      {/* スコアボード */}
      <section aria-label="スコアボード">
        <h2 className="text-sm font-semibold text-neutral-600 mb-2">スコア</h2>
        <LiveScoreBoard
          teams={teamScores}
          currentTeamId={currentThrower?.teamId}
        />
      </section>

      {/* 投擲入力（観戦モードでは非表示） */}
      {!watchMode && currentThrower && (
        <section aria-label="投擲記録">
          <h2 className="text-sm font-semibold text-neutral-600 mb-2">投擲を記録</h2>
          <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-4">
            <ThrowRecorder
              shareCode={match.shareCode}
              currentTeamId={currentThrower.teamId}
              currentUserId={currentThrower.userId}
            />
          </div>
        </section>
      )}

      {/* 観戦モードのメッセージ */}
      {watchMode && (
        <div className="text-center py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
          <p className="text-xs text-neutral-500">観戦モード — スコアはリアルタイムで更新されます</p>
        </div>
      )}

      {/* 投擲履歴 */}
      <section aria-label="投擲履歴">
        <h2 className="text-sm font-semibold text-neutral-600 mb-2">
          投擲履歴（{throwHistory.length}回）
        </h2>
        <ThrowHistory throws={throwHistory} />
      </section>
    </div>
  )
}

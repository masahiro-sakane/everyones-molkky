'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMatch, type MatchData } from '@/hooks/useMatch'
import { useScoreSheet } from '@/hooks/useScoreSheet'
import { useRealtimeScore } from '@/hooks/useRealtimeScore'
import { useOptimisticMatch, type PendingThrow } from '@/hooks/useOptimisticMatch'
import { ScoreSheetView } from './ScoreSheetView'
import { ThrowRecorder } from './ThrowRecorder'
import { CurrentThrower } from './CurrentThrower'
import { ShareButton } from './ShareButton'
import { ConnectionStatus } from './ConnectionStatus'
import { MatchLimitStatus } from './MatchLimitStatus'
import { WinnerBanner } from './WinnerBanner'
import { ScoreCellEditPopover, type EditTarget } from './ScoreCellEditPopover'
import { SetTransitionBanner } from './SetTransitionBanner'

type SheetMatchBoardProps = {
  match: MatchData
  /** 観戦モード（投擲入力を非表示） */
  watchMode?: boolean
}

export function SheetMatchBoard({ match, watchMode = false }: SheetMatchBoardProps) {
  const router = useRouter()
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const sheetContainerRef = useRef<HTMLDivElement>(null)
  const { optimisticMatch, isPending, applyOptimistic, syncFromServer, rollback } =
    useOptimisticMatch(match)

  // サーバーから最新データが来たら同期
  const matchRef = useRef(match)
  useEffect(() => {
    matchRef.current = match
    syncFromServer(match)
  }, [match, syncFromServer])

  const matchState = useMatch(optimisticMatch)
  const sheet = useScoreSheet(optimisticMatch)

  const handleRealtimeEvent = useCallback(() => {
    router.refresh()
  }, [router])

  const { status: connStatus } = useRealtimeScore({
    shareCode: match.shareCode,
    onEvent: handleRealtimeEvent,
  })

  const handleOptimisticThrow = useCallback(
    async (pending: PendingThrow) => {
      applyOptimistic(pending)
      try {
        const res = await fetch(`/api/matches/${match.shareCode}/throws`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: pending.userId,
            teamId: pending.teamId,
            skittlesKnocked: pending.skittlesKnocked,
            faultType: pending.faultType ?? undefined,
          }),
        })
        if (!res.ok) {
          rollback(matchRef.current)
        } else {
          router.refresh()
        }
      } catch {
        rollback(matchRef.current)
      }
    },
    [applyOptimistic, rollback, router, match.shareCode]
  )

  const currentThrower = matchState.currentThrower
  const nextThrower = matchState.nextThrower
  const isFinished = matchState.isFinished && !!matchState.winnerTeamId
  const setTransitionInfo = matchState.setTransitionInfo

  return (
    <div className="flex flex-col gap-2">
      {/* セット間バナー（ゲーム完了・次ゲーム待ち） */}
      {setTransitionInfo && (
        <SetTransitionBanner
          shareCode={match.shareCode}
          info={setTransitionInfo}
          watchMode={watchMode}
        />
      )}

      {/* 試合終了バナー */}
      {isFinished && (
        <WinnerBanner
          winnerTeamId={matchState.winnerTeamId!}
          teams={matchState.teamScores}
          shareCode={match.shareCode}
        />
      )}

      {/* 制限ルール状況 */}
      <MatchLimitStatus
        limitType={match.limitType}
        turnLimit={match.turnLimit}
        timeLimitMinutes={match.timeLimitMinutes}
        startedAt={match.startedAt}
        remainingRounds={matchState.remainingRounds}
        currentRound={matchState.currentRound}
      />

      {/* 投擲者バー（全幅） */}
      {currentThrower && (
        <CurrentThrower
          teamName={match.matchType === 'SOLO' ? '' : currentThrower.teamName}
          throwerName={currentThrower.userName}
          teamOrder={currentThrower.teamOrder}
          totalTeams={currentThrower.totalTeams}
          nextTeamName={match.matchType === 'SOLO' ? undefined : nextThrower?.teamName}
          nextThrowerName={nextThrower?.userName}
        />
      )}

      {/* スコアシート + 入力パネル
          - lg以上: 横並び（シート左・入力右sticky）
          - lg未満: 入力パネルを上、シートを下（入力欄が常に画面上部に見える） */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-[1fr_360px] gap-4">
        {/* スコアシート */}
        <section aria-label="スコアシート" className="min-w-0 flex flex-col gap-2">
          <div ref={sheetContainerRef} className="relative">
            <ScoreSheetView
              data={sheet}
              onEditCell={!watchMode && !isFinished ? (throwId, skittles) => setEditTarget({ throwId, currentSkittles: skittles }) : undefined}
            />
            {editTarget && (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="pointer-events-auto">
                  <ScoreCellEditPopover
                    target={editTarget}
                    shareCode={match.shareCode}
                    onDone={() => { setEditTarget(null); router.refresh() }}
                    onCancel={() => setEditTarget(null)}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <ShareButton shareCode={match.shareCode} />
            <ConnectionStatus status={connStatus} />
          </div>
        </section>

        {/* 入力パネル（観戦モード以外） */}
        {!watchMode && currentThrower && (
          <aside
            aria-label="投擲記録"
            className="lg:sticky lg:top-20 lg:self-start"
          >
            <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-4">
              <ThrowRecorder
                shareCode={match.shareCode}
                currentTeamId={currentThrower.teamId}
                currentUserId={currentThrower.userId}
                isFirstThrow={sheet.isFirstThrow}
                consecutiveMisses={matchState.teamScores.find((t) => t.teamId === currentThrower.teamId)?.consecutiveMisses ?? 0}
                onOptimisticThrow={handleOptimisticThrow}
                isPending={isPending}
              />
            </div>
          </aside>
        )}

        {watchMode && (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="text-center py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
              <p className="text-xs text-neutral-500">
                観戦モード — スコアはリアルタイムで更新されます
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

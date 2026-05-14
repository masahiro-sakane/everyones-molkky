'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMatch, type MatchData } from '@/hooks/useMatch'
import { useScoreSheet } from '@/hooks/useScoreSheet'
import { useRealtimeScore, type RealtimeScoreEvent } from '@/hooks/useRealtimeScore'
import { toMatchData } from '@/lib/matchDataMapper'
import { useOptimisticMatch, type PendingThrow } from '@/hooks/useOptimisticMatch'
import { ScoreSheetView } from './ScoreSheetView'
import { ThrowRecorder } from './ThrowRecorder'
import { ShareButton } from './ShareButton'
import { ConnectionStatus } from './ConnectionStatus'
import { MatchLimitStatus } from './MatchLimitStatus'
import { WinnerBanner } from './WinnerBanner'
import { ScoreCellEditPopover, type EditTarget } from './ScoreCellEditPopover'
import { SetTransitionBanner } from './SetTransitionBanner'
import { DiscardMatchButton } from './DiscardMatchButton'

type SheetMatchBoardProps = {
  match: MatchData
  /** 観戦モード（投擲入力を非表示） */
  watchMode?: boolean
  /** 記録を破棄ボタンを表示するか */
  canDiscard?: boolean
}

// 安定したclientIdを生成（タブごとに一意）
function getClientId(): string {
  if (typeof sessionStorage === 'undefined') return ''
  const key = 'molkky-client-id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(key, id)
  }
  return id
}

export function SheetMatchBoard({ match, watchMode = false, canDiscard = false }: SheetMatchBoardProps) {
  const router = useRouter()
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const clientIdRef = useRef<string>('')
  const { optimisticMatch, isPending, applyOptimistic, syncFromServer, rollback } =
    useOptimisticMatch(match)

  useEffect(() => {
    clientIdRef.current = getClientId()
  }, [])

  // サーバーから最新データが来たら同期
  const matchRef = useRef(match)
  useEffect(() => {
    matchRef.current = match
    syncFromServer(match)
  }, [match, syncFromServer])

  const matchState = useMatch(optimisticMatch)
  const sheet = useScoreSheet(optimisticMatch)

  // SSEイベント: 他ユーザーの投擲を受信したらAPIから最新データを取得してローカル更新
  // router.refresh()によるRSC全体再レンダリングを避けることで高速化
  const handleRealtimeEvent = useCallback(async (event: RealtimeScoreEvent) => {
    try {
      const res = await fetch(`/api/matches/${match.shareCode}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          syncFromServer(toMatchData(json.data))
          // 試合終了・セット終了時はRSCも更新
          if (event.type === 'matchFinished') {
            router.refresh()
          }
          return
        }
      }
    } catch {
      // フォールバック: RSC再レンダリング
    }
    router.refresh()
  }, [router, match.shareCode, syncFromServer])

  const { status: connStatus } = useRealtimeScore({
    shareCode: match.shareCode,
    clientId: clientIdRef.current,
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
            clientId: clientIdRef.current,
          }),
        })
        if (!res.ok) {
          rollback(matchRef.current)
        } else {
          const json = await res.json()
          // POSTレスポンスに最新MatchDataが含まれていればそれで同期（router.refresh()不要）
          if (json.match) {
            syncFromServer(toMatchData(json.match))
          } else {
            router.refresh()
          }
        }
      } catch {
        rollback(matchRef.current)
      }
    },
    [applyOptimistic, rollback, syncFromServer, router, match.shareCode]
  )

  const currentThrower = matchState.currentThrower
  // 試合全体が終了しているか（match.status === 'FINISHED'）
  const isFinished = matchState.isFinished
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

      {/* スコアシート + 入力パネル
          - lg以上: 横並び（シート左・入力右 viewport固定）
          - lg未満: 入力パネルを上（画面内に収まる固定高さ）、シートを下 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] gap-4 lg:items-start">
        {/* 入力パネル（観戦モード以外） */}
        {!watchMode && currentThrower && (
          <aside
            aria-label="投擲記録"
            className="lg:sticky lg:top-4 lg:self-start lg:order-2 order-1"
          >
            <div className="bg-neutral-0 border border-neutral-300 rounded-lg p-3 flex flex-col h-[calc(100svh-6rem)] lg:h-[calc(100svh-5rem)] overflow-hidden">
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
          <aside className="lg:sticky lg:top-4 lg:self-start lg:order-2 order-1">
            <div className="text-center py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
              <p className="text-xs text-neutral-500">
                観戦モード — スコアはリアルタイムで更新されます
              </p>
            </div>
          </aside>
        )}

        {/* スコアシート */}
        <section aria-label="スコアシート" className="min-w-0 flex flex-col gap-2 lg:order-1 order-2">
          <div>
            <ScoreSheetView
              data={sheet}
              onEditCell={!watchMode && !isFinished ? (throwId, skittles, rect) => setEditTarget({ throwId, currentSkittles: skittles, anchorRect: rect }) : undefined}
              editingThrowId={editTarget?.throwId}
            />
          </div>
          {editTarget && (
            <ScoreCellEditPopover
              target={editTarget}
              shareCode={match.shareCode}
              onDone={() => { setEditTarget(null); router.refresh() }}
              onCancel={() => setEditTarget(null)}
            />
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            {canDiscard && <DiscardMatchButton shareCode={match.shareCode} />}
            <ShareButton shareCode={match.shareCode} />
            <ConnectionStatus status={connStatus} />
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { CameraAdviceButton } from './CameraAdviceButton'

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
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const handleCameraOpenChange = (open: boolean) => {
    setCameraOpen(open)
    if (open) setEditTarget(null)
  }
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
  const handleRealtimeEvent = useCallback(async (event: RealtimeScoreEvent) => {
    try {
      const res = await fetch(`/api/matches/${match.shareCode}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          syncFromServer(toMatchData(json.data))
          return
        }
      }
    } catch {
      // fetch失敗は無視（次のポーリングまたはSSEで回復）
    }
  }, [match.shareCode, syncFromServer])

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
          if (json.match) {
            syncFromServer(toMatchData(json.match))
          } else {
            // matchが含まれない場合はAPIから再取得
            const latest = await fetch(`/api/matches/${match.shareCode}`, { cache: 'no-store' })
            if (latest.ok) {
              const latestJson = await latest.json()
              if (latestJson.data) syncFromServer(toMatchData(latestJson.data))
            }
          }
        }
      } catch {
        rollback(matchRef.current)
      }
    },
    [applyOptimistic, rollback, syncFromServer, match.shareCode]
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

      {/* スコアシート + 入力パネル
          - lg以上: 横並び（シート左・入力右 viewport固定）
          - lg未満: 入力パネルを上（画面内に収まる固定高さ）、シートを下 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] gap-4 lg:items-start">
        {/* 右カラム: 入力パネル or 観戦表示 + 順位・アクション行 */}
        <aside
          aria-label="入力・情報パネル"
          className="lg:sticky lg:top-4 lg:self-start lg:order-2 order-1 flex flex-col gap-2 lg:h-[calc(100svh-5rem)]"
        >
          {/* 制限ルール状況 */}
          <MatchLimitStatus
            limitType={match.limitType}
            turnLimit={match.turnLimit}
            timeLimitMinutes={match.timeLimitMinutes}
            startedAt={match.startedAt}
            remainingRounds={matchState.remainingRounds}
            currentRound={matchState.currentRound}
          />

          {/* 得点入力 */}
          {!watchMode && currentThrower && (() => {
            const currentTeamScore = matchState.teamScores.find((t) => t.teamId === currentThrower.teamId)
            const consecutiveMisses = currentTeamScore?.consecutiveMisses ?? 0
            const remainingScore = 50 - (currentTeamScore?.totalScore ?? 0)
            const opponentRemainingScores = matchState.teamScores
              .filter((t) => t.teamId !== currentThrower.teamId && !t.isDisqualified)
              .map((t) => 50 - t.totalScore)
            const adviceCtx = {
              remainingScore,
              consecutiveMisses,
              opponentRemainingScores,
              isLastChance: false,
            }
            return (
              <div className="relative bg-neutral-0 border border-neutral-300 rounded-lg p-3 flex flex-col lg:flex-1 lg:min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-600">{currentThrower.teamName}</span>
                  <CameraAdviceButton ctx={adviceCtx} onOpenChange={handleCameraOpenChange} />
                </div>
                <ThrowRecorder
                  shareCode={match.shareCode}
                  currentTeamId={currentThrower.teamId}
                  currentUserId={currentThrower.userId}
                  isFirstThrow={sheet.isFirstThrow}
                  consecutiveMisses={consecutiveMisses}
                  onOptimisticThrow={handleOptimisticThrow}
                  isPending={isPending}
                />
              </div>
            )
          })()}

          {/* 観戦モード */}
          {watchMode && (
            <div className="text-center py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
              <p className="text-xs text-neutral-500">
                観戦モード — スコアはリアルタイムで更新されます
              </p>
            </div>
          )}

          {/* 順位 */}
          {sheet.rankings.length > 0 && (
            <div className="flex flex-col gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-md">
              {sheet.rankings.map((r) => (
                <div key={r.teamId} className="flex items-center gap-2 text-sm" data-testid={`rank-${r.rank}`}>
                  <span className={[
                    'inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold shrink-0',
                    r.rank === 1 ? 'bg-warning-100 text-warning-700 border border-warning-400' : 'bg-neutral-200 text-neutral-700',
                  ].join(' ')}>
                    {r.rank}位
                  </span>
                  <span className={[r.isDisqualified ? 'line-through text-neutral-400' : 'text-neutral-900', 'font-medium'].join(' ')}>
                    {r.teamName}
                  </span>
                  <span className="text-neutral-500 tabular-nums ml-auto">({r.totalScore})</span>
                </div>
              ))}
            </div>
          )}

          {/* アクション */}
          <div className="flex items-center gap-2 justify-end">
            {canDiscard && <DiscardMatchButton shareCode={match.shareCode} />}
            <ShareButton shareCode={match.shareCode} />
            <ConnectionStatus status={connStatus} />
          </div>
        </aside>

        {/* スコアシート */}
        <section aria-label="スコアシート" className="min-w-0 flex flex-col gap-2 lg:order-1 order-2">
          <ScoreSheetView
            data={sheet}
            onEditCell={!watchMode && !isFinished && !cameraOpen ? (throwId, skittles, rect) => setEditTarget({ throwId, currentSkittles: skittles, anchorRect: rect }) : undefined}
            editingThrowId={editTarget?.throwId}
          />
          {editTarget && !cameraOpen && (
            <ScoreCellEditPopover
              target={editTarget}
              shareCode={match.shareCode}
              onDone={async () => {
                setEditTarget(null)
                const res = await fetch(`/api/matches/${match.shareCode}`, { cache: 'no-store' })
                if (res.ok) {
                  const json = await res.json()
                  if (json.data) syncFromServer(toMatchData(json.data))
                }
              }}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </section>
      </div>
    </div>
  )
}

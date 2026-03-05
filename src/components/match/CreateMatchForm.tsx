'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createMatchAction, type MatchActionState } from '@/app/actions/match'

type TeamMember = {
  userId: string
  user: { id: string; name: string }
}

type Team = {
  id: string
  name: string
  members: TeamMember[]
}

type LimitType = 'NONE' | 'TURNS' | 'TIME'

type CreateMatchFormProps = {
  teams: Team[]
}

const initialState: MatchActionState = {}

export function CreateMatchForm({ teams }: CreateMatchFormProps) {
  const [state, action, isPending] = useActionState(createMatchAction, initialState)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [memberOrders, setMemberOrders] = useState<Record<string, string[]>>({})
  const [limitType, setLimitType] = useState<LimitType>('NONE')
  const [turnLimit, setTurnLimit] = useState(12)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20)

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        const next = prev.filter((id) => id !== teamId)
        setMemberOrders((orders) => {
          const { [teamId]: _, ...rest } = orders
          return rest
        })
        return next
      }
      const team = teams.find((t) => t.id === teamId)
      if (team) {
        setMemberOrders((orders) => ({
          ...orders,
          [teamId]: team.members.map((m) => m.userId),
        }))
      }
      return [...prev, teamId]
    })
  }

  const moveMember = (teamId: string, fromIndex: number, toIndex: number) => {
    setMemberOrders((orders) => {
      const current = orders[teamId] ?? []
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return { ...orders, [teamId]: next }
    })
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* チーム選択 */}
      <div>
        <p className="text-sm font-medium text-neutral-800 mb-3">
          参加チームを選択
          <span className="ml-0.5 text-danger-500" aria-hidden="true">*</span>
          <span className="ml-2 text-xs font-normal text-neutral-500">（2チーム以上選択してください）</span>
        </p>

        {teams.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">
            チームがありません。先にチームを作成してください。
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teams.map((team) => {
              const isSelected = selectedTeamIds.includes(team.id)
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className={[
                    'flex items-center justify-between px-4 py-3 rounded-md border text-left transition-colors',
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-neutral-300 bg-neutral-0 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50',
                  ].join(' ')}
                  aria-pressed={isSelected}
                  data-testid={`team-button-${team.id}`}
                >
                  <span className="font-medium text-sm">{team.name}</span>
                  <Badge variant={isSelected ? 'primary' : 'default'}>
                    {team.members.length}人
                  </Badge>
                </button>
              )
            })}
          </div>
        )}

        {selectedTeamIds.map((id) => (
          <input key={id} type="hidden" name="teamIds" value={id} />
        ))}

        {state.errors?.teamIds && (
          <p role="alert" className="mt-2 text-xs text-danger-600">
            {state.errors.teamIds[0]}
          </p>
        )}
      </div>

      {/* 投擲順・メンバー順 */}
      {selectedTeamIds.length >= 2 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3">
          <p className="text-xs text-neutral-600 font-medium mb-2">チームの投擲順（選択順）</p>
          <ol className="list-decimal list-inside text-sm text-neutral-700 space-y-0.5 mb-4">
            {selectedTeamIds.map((id) => {
              const team = teams.find((t) => t.id === id)
              return team ? <li key={id}>{team.name}</li> : null
            })}
          </ol>

          <div className="flex flex-col gap-3">
            {selectedTeamIds.map((teamId) => {
              const team = teams.find((t) => t.id === teamId)
              if (!team || team.members.length <= 1) return null

              const order = memberOrders[teamId] ?? team.members.map((m) => m.userId)
              const orderedMembers = order
                .map((uid) => team.members.find((m) => m.userId === uid))
                .filter(Boolean) as TeamMember[]

              return (
                <div key={teamId}>
                  <p className="text-xs text-neutral-500 mb-1">{team.name} の投擲順</p>
                  <div className="flex flex-col gap-1">
                    {orderedMembers.map((member, index) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-2 bg-neutral-0 border border-neutral-200 rounded px-3 py-1.5"
                      >
                        <span className="text-xs text-neutral-400 w-4 shrink-0">{index + 1}</span>
                        <span className="text-sm text-neutral-700 flex-1">{member.user.name}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveMember(teamId, index, index - 1)}
                            className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`${member.user.name}を上に移動`}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === orderedMembers.length - 1}
                            onClick={() => moveMember(teamId, index, index + 1)}
                            className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`${member.user.name}を下に移動`}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <input
                    type="hidden"
                    name={`memberOrder_${teamId}`}
                    value={JSON.stringify(order)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ルール詳細設定 */}
      <div>
        <p className="text-sm font-medium text-neutral-800 mb-3">制限ルール</p>
        <div className="flex flex-col gap-2">
          {(
            [
              { value: 'NONE', label: '制限なし', desc: '50点到達または全チーム失格まで続ける' },
              { value: 'TURNS', label: 'ターン制限', desc: '指定ラウンド終了後に最高得点チームが勝利' },
              { value: 'TIME', label: '時間制限', desc: '指定時間経過後のラウンド終了時に最高得点チームが勝利' },
            ] as { value: LimitType; label: string; desc: string }[]
          ).map(({ value, label, desc }) => (
            <label
              key={value}
              className={[
                'flex items-start gap-3 px-4 py-3 rounded-md border cursor-pointer transition-colors',
                limitType === value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-neutral-300 bg-neutral-0 hover:border-neutral-400',
              ].join(' ')}
            >
              <input
                type="radio"
                name="limitType"
                value={value}
                checked={limitType === value}
                onChange={() => setLimitType(value)}
                className="mt-0.5 accent-brand-500"
              />
              <div>
                <p className={`text-sm font-medium ${limitType === value ? 'text-brand-700' : 'text-neutral-800'}`}>
                  {label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* ターン数入力 */}
        {limitType === 'TURNS' && (
          <div className="mt-3 flex items-center gap-3">
            <input type="hidden" name="turnLimit" value={turnLimit} />
            <label className="text-sm text-neutral-700 shrink-0">ラウンド数</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTurnLimit((v) => Math.max(1, v - 1))}
                className="w-8 h-8 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 flex items-center justify-center text-lg font-bold"
                aria-label="ラウンド数を減らす"
              >
                −
              </button>
              <span className="w-12 text-center font-bold text-lg tabular-nums">{turnLimit}</span>
              <button
                type="button"
                onClick={() => setTurnLimit((v) => Math.min(100, v + 1))}
                className="w-8 h-8 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 flex items-center justify-center text-lg font-bold"
                aria-label="ラウンド数を増やす"
              >
                ＋
              </button>
            </div>
            <span className="text-sm text-neutral-500">ラウンド</span>
          </div>
        )}

        {/* 時間入力 */}
        {limitType === 'TIME' && (
          <div className="mt-3 flex items-center gap-3">
            <input type="hidden" name="timeLimitMinutes" value={timeLimitMinutes} />
            <label className="text-sm text-neutral-700 shrink-0">制限時間</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimeLimitMinutes((v) => Math.max(1, v - 5))}
                className="w-8 h-8 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 flex items-center justify-center text-lg font-bold"
                aria-label="制限時間を減らす"
              >
                −
              </button>
              <span className="w-12 text-center font-bold text-lg tabular-nums">{timeLimitMinutes}</span>
              <button
                type="button"
                onClick={() => setTimeLimitMinutes((v) => Math.min(180, v + 5))}
                className="w-8 h-8 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 flex items-center justify-center text-lg font-bold"
                aria-label="制限時間を増やす"
              >
                ＋
              </button>
            </div>
            <span className="text-sm text-neutral-500">分</span>
          </div>
        )}
      </div>

      {state.message && (
        <p role="alert" className="text-sm text-danger-600">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          isLoading={isPending}
          disabled={selectedTeamIds.length < 2}
          data-testid="start-match-submit"
        >
          試合を開始
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => history.back()}
        >
          キャンセル
        </Button>
      </div>
    </form>
  )
}

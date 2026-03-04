'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createMatchAction, type MatchActionState } from '@/app/actions/match'

type Team = {
  id: string
  name: string
  members: { userId: string }[]
}

type CreateMatchFormProps = {
  teams: Team[]
}

const initialState: MatchActionState = {}

export function CreateMatchForm({ teams }: CreateMatchFormProps) {
  const [state, action, isPending] = useActionState(createMatchAction, initialState)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  return (
    <form action={action} className="flex flex-col gap-6">
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

        {/* hidden inputs for selected teams */}
        {selectedTeamIds.map((id) => (
          <input key={id} type="hidden" name="teamIds" value={id} />
        ))}

        {state.errors?.teamIds && (
          <p role="alert" className="mt-2 text-xs text-danger-600">
            {state.errors.teamIds[0]}
          </p>
        )}
      </div>

      {selectedTeamIds.length >= 2 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3">
          <p className="text-xs text-neutral-600 font-medium mb-1">投擲順（選択順）</p>
          <ol className="list-decimal list-inside text-sm text-neutral-700 space-y-0.5">
            {selectedTeamIds.map((id, index) => {
              const team = teams.find((t) => t.id === id)
              return team ? <li key={id}>{team.name}</li> : null
            })}
          </ol>
        </div>
      )}

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

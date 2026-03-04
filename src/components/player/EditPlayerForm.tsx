'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { updatePlayerAction, type ActionState } from '@/app/actions/player'

const initialState: ActionState = {}

type EditPlayerFormProps = {
  playerId: string
  defaultName: string
}

export function EditPlayerForm({ playerId, defaultName }: EditPlayerFormProps) {
  const boundAction = updatePlayerAction.bind(null, playerId)
  const [state, action, isPending] = useActionState(boundAction, initialState)

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input
        name="name"
        label="プレイヤー名"
        defaultValue={defaultName}
        isRequired
        error={state.errors?.name?.[0]}
        disabled={isPending}
        data-testid="player-name-input"
      />

      {state.message && (
        <p role="alert" className="text-sm text-danger-600">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" isLoading={isPending} data-testid="save-player-submit">
          保存
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => history.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}

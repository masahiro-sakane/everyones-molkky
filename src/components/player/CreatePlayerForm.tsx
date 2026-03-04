'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createPlayerAction, type ActionState } from '@/app/actions/player'

const initialState: ActionState = {}

export function CreatePlayerForm() {
  const [state, action, isPending] = useActionState(createPlayerAction, initialState)

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input
        name="name"
        label="プレイヤー名"
        placeholder="例：田中 太郎"
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
        <Button type="submit" variant="primary" isLoading={isPending} data-testid="create-player-submit">
          プレイヤーを作成
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => history.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}

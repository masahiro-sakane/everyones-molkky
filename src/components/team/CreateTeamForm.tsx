'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createTeamAction, type ActionState } from '@/app/actions/team'

const initialState: ActionState = {}

export function CreateTeamForm() {
  const [state, action, isPending] = useActionState(createTeamAction, initialState)

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input
        name="name"
        label="チーム名"
        placeholder="例：チームA"
        isRequired
        error={state.errors?.name?.[0]}
        disabled={isPending}
      />

      {state.message && (
        <p role="alert" className="text-sm text-danger-600">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" isLoading={isPending} data-testid="create-team-submit">
          チームを作成
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => history.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}

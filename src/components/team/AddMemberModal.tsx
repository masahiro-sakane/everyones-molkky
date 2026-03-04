'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  createUserAndAddMemberAction,
  addExistingMemberAction,
  type ActionState,
} from '@/app/actions/team'

type User = {
  id: string
  name: string
}

type AddMemberModalProps = {
  teamId: string
  existingUsers: User[]
  memberUserIds: string[]
  onClose: () => void
}

const initialState: ActionState = {}

function NewUserForm({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const boundAction = createUserAndAddMemberAction.bind(null, teamId)
  const [state, action, isPending] = useActionState(boundAction, initialState)

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input
        name="name"
        label="名前"
        placeholder="田中 太郎"
        isRequired
        error={state.errors?.name?.[0]}
        disabled={isPending}
        data-testid="member-name-input"
      />

      {state.message && (
        <p
          role="alert"
          className={`text-sm ${state.errors ? 'text-danger-600' : 'text-success-700'}`}
        >
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" isLoading={isPending} data-testid="add-member-submit">
          追加
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}

function ExistingUserForm({
  teamId,
  existingUsers,
  memberUserIds,
  onClose,
}: {
  teamId: string
  existingUsers: User[]
  memberUserIds: string[]
  onClose: () => void
}) {
  const boundAction = addExistingMemberAction.bind(null, teamId)
  const [state, action, isPending] = useActionState(boundAction, initialState)

  const availableUsers = existingUsers.filter((u) => !memberUserIds.includes(u.id))

  return (
    <form action={action} className="flex flex-col gap-4">
      {availableUsers.length === 0 ? (
        <p className="text-sm text-neutral-500">追加できるユーザーがいません。</p>
      ) : (
        <Select
          name="userId"
          label="ユーザーを選択"
          isRequired
          error={state.errors?.userId?.[0]}
          disabled={isPending}
          options={availableUsers.map((u) => ({ label: u.name, value: u.id }))}
        />
      )}

      {state.message && (
        <p
          role="alert"
          className={`text-sm ${state.errors ? 'text-danger-600' : 'text-success-700'}`}
        >
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          isLoading={isPending}
          disabled={availableUsers.length === 0}
        >
          追加
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}

export function AddMemberModal({ teamId, existingUsers, memberUserIds, onClose }: AddMemberModalProps) {
  const [tab, setTab] = useState<'new' | 'existing'>('new')

  return (
    <Modal isOpen title="メンバーを追加" onClose={onClose}>
      <div className="flex gap-2 mb-4 border-b border-neutral-300">
        <button
          type="button"
          onClick={() => setTab('new')}
          className={[
            'pb-2 px-1 text-sm font-medium border-b-2 transition-colors',
            tab === 'new'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          新規ユーザーとして追加
        </button>
        <button
          type="button"
          onClick={() => setTab('existing')}
          className={[
            'pb-2 px-1 text-sm font-medium border-b-2 transition-colors',
            tab === 'existing'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          既存ユーザーから追加
        </button>
      </div>

      {tab === 'new' ? (
        <NewUserForm teamId={teamId} onClose={onClose} />
      ) : (
        <ExistingUserForm
          teamId={teamId}
          existingUsers={existingUsers}
          memberUserIds={memberUserIds}
          onClose={onClose}
        />
      )}

      <p className="mt-4 text-xs text-neutral-400">
        プレイヤーを一括管理する場合は{' '}
        <Link href="/players" className="text-brand-600 hover:underline" onClick={onClose}>
          プレイヤー管理
        </Link>{' '}
        をご利用ください。
      </p>
    </Modal>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddMemberModal } from './AddMemberModal'
import { removeMemberAction } from '@/app/actions/team'

type Member = {
  userId: string
  role: string
  user: {
    id: string
    name: string
  }
}

type User = {
  id: string
  name: string
}

type MemberListProps = {
  teamId: string
  members: Member[]
  allUsers: User[]
}

export function MemberList({ teamId, members, allUsers }: MemberListProps) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const memberUserIds = members.map((m) => m.userId)

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      await removeMemberAction(teamId, userId)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-neutral-800">
          メンバー ({members.length}人)
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowModal(true)}
          disabled={isPending}
          data-testid="add-member-button"
        >
          メンバーを追加
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-neutral-500 py-4 text-center">
          まだメンバーがいません。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between px-4 py-3 bg-neutral-0 border border-neutral-300 rounded-md"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium"
                  aria-hidden="true"
                >
                  {member.user.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-neutral-800">{member.user.name}</span>
                {member.role === 'captain' && (
                  <Badge variant="primary">
                    キャプテン
                  </Badge>
                )}
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => handleRemove(member.userId)}
                disabled={isPending}
                aria-label={`${member.user.name}をメンバーから削除`}
              >
                削除
              </Button>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <AddMemberModal
          teamId={teamId}
          existingUsers={allUsers}
          memberUserIds={memberUserIds}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

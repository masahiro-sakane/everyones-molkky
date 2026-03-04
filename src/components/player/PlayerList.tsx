'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { deletePlayerAction } from '@/app/actions/player'

type Team = {
  id: string
  name: string
}

type Player = {
  id: string
  name: string
  teamMembers: { team: Team }[]
}

type PlayerListProps = {
  players: Player[]
}

export function PlayerList({ players }: PlayerListProps) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setDeletingId(id)
    startTransition(async () => {
      await deletePlayerAction(id)
      setDeletingId(null)
    })
  }

  if (players.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-4 text-center">
        まだプレイヤーがいません。
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => {
        const isDeleting = deletingId === player.id
        return (
          <li
            key={player.id}
            className="flex items-center justify-between px-4 py-3 bg-neutral-0 border border-neutral-300 rounded-md"
            data-testid={`player-item-${player.id}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium shrink-0"
                aria-hidden="true"
              >
                {player.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{player.name}</p>
                {player.teamMembers.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {player.teamMembers.map(({ team }) => (
                      <Badge key={team.id} variant="default">
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 mt-0.5">チーム未所属</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <Link href={`/players/${player.id}/edit`}>
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={isPending}
                  aria-label={`${player.name}を編集`}
                  data-testid={`edit-player-${player.id}`}
                >
                  編集
                </Button>
              </Link>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => handleDelete(player.id)}
                disabled={isPending}
                isLoading={isDeleting}
                aria-label={`${player.name}を削除`}
                data-testid={`delete-player-${player.id}`}
              >
                削除
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

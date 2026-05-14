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
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {players.map((player) => {
        const isDeleting = deletingId === player.id
        return (
          <li key={player.id} data-testid={`player-item-${player.id}`}>
            <div className="h-full bg-neutral-0 border border-neutral-300 rounded-lg shadow-sm flex flex-col">
              <div className="px-4 pt-4 pb-3 border-b border-neutral-200 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium shrink-0"
                  aria-hidden="true"
                >
                  {player.name.charAt(0)}
                </div>
                <p className="text-sm font-semibold text-neutral-800 truncate">{player.name}</p>
              </div>

              <div className="px-4 py-3 flex-1">
                {player.teamMembers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {player.teamMembers.map(({ team }) => (
                      <Badge key={team.id} variant="default">
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">チーム未所属</p>
                )}
              </div>

              <div className="px-4 pb-3 flex gap-2">
                <Link href={`/players/${player.id}/edit`} className="flex-1">
                  <Button
                    variant="subtle"
                    size="sm"
                    disabled={isPending}
                    aria-label={`${player.name}を編集`}
                    data-testid={`edit-player-${player.id}`}
                    className="w-full"
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
                  className="flex-1"
                >
                  削除
                </Button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

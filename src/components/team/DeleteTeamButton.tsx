'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Props = {
  teamId: string
  teamName: string
}

export function DeleteTeamButton({ teamId, teamName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'チームの削除に失敗しました')
        setLoading(false)
        return
      }
      router.push('/teams')
      router.refresh()
    } catch {
      setError('チームの削除に失敗しました')
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        チームを削除
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-neutral-0 rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-neutral-900 mb-2">チームを削除しますか？</h2>
            <p className="text-sm text-neutral-600 mb-1">
              <span className="font-medium">「{teamName}」</span> を削除します。この操作は元に戻せません。
            </p>
            {error && (
              <p className="text-sm text-danger-600 mt-3 bg-danger-50 border border-danger-200 rounded px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-3 mt-5 justify-end">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => { setOpen(false); setError(null) }}
                disabled={loading}
              >
                キャンセル
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? '削除中...' : '削除する'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

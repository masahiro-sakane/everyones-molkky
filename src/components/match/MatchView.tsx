'use client'

import { useState, useSyncExternalStore } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { MatchData } from '@/hooks/useMatch'
import { MatchBoard } from './MatchBoard'
import { SheetMatchBoard } from './SheetMatchBoard'
import { ViewToggle, type ViewMode } from './ViewToggle'

type MatchViewProps = {
  match: MatchData
  watchMode?: boolean
}

const STORAGE_KEY = 'molkky:viewMode'

function readStoredView(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'sheet' || v === 'card' ? v : null
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

/**
 * 試合表示のビュー切替（スコアシート / カード）
 *
 * - 初回ロード時: localStorage > 画面幅（>= 768px は sheet）の優先順位
 * - ユーザの選択は localStorage に保存
 */
export function MatchView({ match, watchMode = false }: MatchViewProps) {
  const isTabletOrLarger = useMediaQuery('(min-width: 768px)')
  const stored = useSyncExternalStore(
    subscribe,
    readStoredView,
    () => null // SSR フォールバック
  )

  // ユーザが画面内で変更した値（localStorage より優先）
  const [override, setOverride] = useState<ViewMode | null>(null)

  const view: ViewMode = override ?? stored ?? (isTabletOrLarger ? 'sheet' : 'card')

  const handleChange = (next: ViewMode) => {
    setOverride(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {view === 'sheet' ? (
        <SheetMatchBoard match={match} watchMode={watchMode} />
      ) : (
        <MatchBoard match={match} watchMode={watchMode} />
      )}

      {/* ビュー切替（下部） */}
      <div className="flex justify-end pt-1">
        <ViewToggle value={view} onChange={handleChange} />
      </div>
    </div>
  )
}

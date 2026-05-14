'use client'

import { useEffect, useState } from 'react'

/**
 * メディアクエリの一致状態を返す
 *
 * SSR時は false、マウント後にクライアントの実際の状態を反映する
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return

    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)

    update()

    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return matches
}

'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'

const navItems = [
  {
    href: '/',
    label: 'ホーム',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7a1 1 0 0 0 1.414 1.414L4 10.414V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3h2v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-6.586l.293.293a1 1 0 0 0 1.414-1.414l-7-7Z" />
      </svg>
    ),
  },
  {
    href: '/matches/new',
    label: '試合を始める',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
      </svg>
    ),
  },
  {
    href: '/teams',
    label: 'チーム',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: '統計',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM9.5 6A1.5 1.5 0 0 0 8 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 9.5 6ZM3.5 10A1.5 1.5 0 0 0 2 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 3.5 10Z" />
      </svg>
    ),
  },
]

// ページ下端から何px以内でフッターを表示するか
const BOTTOM_THRESHOLD = 80
// 操作後に隠れるまでの時間 (ms)
const HIDE_DELAY = 2500

type MatchLayoutProps = {
  children: ReactNode
}

export function MatchLayout({ children }: MatchLayoutProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    setIsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setIsVisible(false), HIDE_DELAY)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const distanceFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      if (distanceFromBottom <= BOTTOM_THRESHOLD) {
        // 下端付近: タイマーなしで常時表示
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        setIsVisible(true)
      } else {
        show()
      }
    }

    const handlePointerMove = () => show()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    // タッチ操作（スマホ）
    window.addEventListener('touchstart', handlePointerMove, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchstart', handlePointerMove)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [show])

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <main className="flex-1 w-full max-w-5xl mx-auto px-2 py-2 pb-20">
        {children}
      </main>

      {/* フッターナビゲーション */}
      <nav
        className={`fixed bottom-0 inset-x-0 bg-neutral-0 border-t border-neutral-300 shadow-[0_-1px_4px_rgba(0,0,0,0.06)] z-40 transition-transform duration-200 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-label="メインナビゲーション"
      >
        <div className="flex items-stretch max-w-lg md:max-w-2xl mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
                  isActive
                    ? 'text-brand-600'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type UserMenuProps = {
  user: {
    name?: string | null
    image?: string | null
  }
  onSignOut: () => void
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-neutral-300 hover:ring-2 hover:ring-brand-400 transition-all"
        aria-label="ユーザーメニューを開く"
        aria-expanded={open}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? 'ユーザー'}
            width={32}
            height={32}
            className="object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-neutral-600 bg-neutral-200 w-full h-full flex items-center justify-center">
            {user.name?.charAt(0) ?? '?'}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-neutral-0 border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-neutral-100">
            <p className="text-xs font-medium text-neutral-900 truncate">{user.name}</p>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  )
}

export function LoginLink() {
  return (
    <Link
      href="/login"
      className="text-xs text-neutral-500 hover:text-brand-600 transition-colors"
    >
      ログイン
    </Link>
  )
}

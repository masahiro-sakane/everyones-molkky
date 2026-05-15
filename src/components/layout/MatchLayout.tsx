import type { ReactNode } from 'react'
import { auth, signOut } from '@/auth'
import { FooterNav } from './FooterNav'

type MatchLayoutProps = {
  children: ReactNode
}

export async function MatchLayout({ children }: MatchLayoutProps) {
  const session = await auth()

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <main className="flex-1 w-full max-w-5xl mx-auto px-2 py-2 pb-20">
        {children}
      </main>
      <FooterNav user={session?.user} onSignOut={handleSignOut} />
    </div>
  )
}

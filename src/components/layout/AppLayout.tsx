import type { ReactNode } from 'react'
import { Header } from './Header'

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">{children}</main>
      <footer className="bg-neutral-0 border-t border-neutral-300 py-4 text-center text-xs text-neutral-500">
        <p>みんなのモルック &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

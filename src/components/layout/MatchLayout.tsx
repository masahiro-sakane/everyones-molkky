import type { ReactNode } from 'react'

type MatchLayoutProps = {
  children: ReactNode
}

export function MatchLayout({ children }: MatchLayoutProps) {
  return <>{children}</>
}

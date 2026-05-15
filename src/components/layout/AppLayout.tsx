import type { ReactNode } from 'react'
import { MatchLayout } from './MatchLayout'

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return <MatchLayout>{children}</MatchLayout>
}

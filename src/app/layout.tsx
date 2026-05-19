import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { auth } from '@/auth'
import { FooterNav } from '@/components/layout/FooterNav'
import { handleSignOut } from '@/app/actions/auth'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'みんなのモルック',
    template: '%s | みんなのモルック',
  },
  description: 'フィンランド発祥のスポーツ「モルック」に特化したスコア管理アプリ。チーム・ユーザー管理、リアルタイムスコア共有、統計分析が可能です。',
  keywords: ['モルック', 'molkky', 'スコア管理', 'スポーツ', 'フィンランド'],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'みんなのモルック',
    title: 'みんなのモルック',
    description: 'フィンランド発祥のスポーツ「モルック」に特化したスコア管理アプリ',
  },
  twitter: {
    card: 'summary',
    title: 'みんなのモルック',
    description: 'フィンランド発祥のスポーツ「モルック」に特化したスコア管理アプリ',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen flex flex-col bg-neutral-100">
          <main className="flex-1 w-full max-w-5xl mx-auto px-2 py-2 pb-20">
            {children}
          </main>
          <FooterNav user={session?.user} onSignOut={handleSignOut} />
        </div>
      </body>
    </html>
  )
}

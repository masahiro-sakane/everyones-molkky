import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}

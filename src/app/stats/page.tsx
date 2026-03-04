import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'

export const metadata: Metadata = {
  title: '統計・分析',
  description: 'チーム・プレイヤーの統計データを分析できます。',
}

const statsLinks = [
  {
    href: '/stats/teams',
    title: 'チーム統計',
    description: '勝率・平均スコア・ミス率など、チームごとの成績を確認',
  },
  {
    href: '/stats/users',
    title: 'プレイヤー統計',
    description: '投擲数・平均得点・最高一投など、個人成績を確認',
  },
]

export default function StatsPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-neutral-900">統計・分析</h1>
          <p className="text-sm text-neutral-500 mt-1">試合データから各種統計を確認できます</p>
        </div>

        <div className="flex flex-col gap-3">
          {statsLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block bg-neutral-0 border border-neutral-300 rounded-lg px-5 py-4 hover:border-brand-400 hover:shadow-sm transition-all"
            >
              <p className="font-semibold text-neutral-900 mb-1">{item.title}</p>
              <p className="text-sm text-neutral-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

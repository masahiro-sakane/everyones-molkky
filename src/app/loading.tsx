import { AppLayout } from '@/components/layout/AppLayout'

export default function Loading() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">読み込み中...</p>
        </div>
      </div>
    </AppLayout>
  )
}

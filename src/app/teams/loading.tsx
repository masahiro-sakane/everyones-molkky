import { AppLayout } from '@/components/layout/AppLayout'

export default function Loading() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-28 bg-neutral-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-neutral-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-neutral-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

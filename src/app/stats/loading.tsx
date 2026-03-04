import { AppLayout } from '@/components/layout/AppLayout'

export default function Loading() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="h-7 w-24 bg-neutral-200 rounded animate-pulse mb-6" />
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-neutral-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

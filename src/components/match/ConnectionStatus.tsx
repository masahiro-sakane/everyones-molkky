import type { ConnectionStatus as Status } from '@/hooks/useRealtimeScore'

type ConnectionStatusProps = {
  status: Status
}

const CONFIG: Record<Status, { label: string; dotClass: string; textClass: string }> = {
  connecting: {
    label: '接続中...',
    dotClass: 'bg-warning-400 animate-pulse',
    textClass: 'text-warning-600',
  },
  connected: {
    label: 'リアルタイム同期中',
    dotClass: 'bg-success-500',
    textClass: 'text-success-600',
  },
  reconnecting: {
    label: '再接続中...',
    dotClass: 'bg-warning-400 animate-pulse',
    textClass: 'text-warning-600',
  },
  disconnected: {
    label: '切断中（5秒ごとに更新）',
    dotClass: 'bg-neutral-400',
    textClass: 'text-neutral-500',
  },
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { label, dotClass } = CONFIG[status]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      title={label}
      className="inline-flex items-center"
    >
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
    </div>
  )
}

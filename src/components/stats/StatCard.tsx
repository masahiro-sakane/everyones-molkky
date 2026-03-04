type StatCardProps = {
  label: string
  value: string | number
  unit?: string
  sub?: string
  highlight?: boolean
}

export function StatCard({ label, value, unit, sub, highlight = false }: StatCardProps) {
  return (
    <div
      className={[
        'flex flex-col gap-1 px-4 py-3 rounded-lg border',
        highlight
          ? 'bg-brand-50 border-brand-200'
          : 'bg-neutral-0 border-neutral-300',
      ].join(' ')}
    >
      <p className="text-xs text-neutral-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-brand-600' : 'text-neutral-900'}`}>
        {value}
        {unit && <span className="text-sm font-normal text-neutral-400 ml-0.5">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  )
}

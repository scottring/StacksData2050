import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  confidence: number
  className?: string
}

export default function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100)

  const color = confidence >= 0.9
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : confidence >= 0.7
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200'

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono', color, className)}>
      {pct}%
    </span>
  )
}

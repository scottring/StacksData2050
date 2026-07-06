import { cn } from '@/lib/utils'

interface FrameworkStatusDotProps {
  status: 'pass' | 'fail' | 'warning' | 'pending' | 'not_applicable'
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const STATUS_COLORS = {
  pass: 'bg-emerald-500',
  fail: 'bg-red-500',
  warning: 'bg-amber-500',
  pending: 'bg-slate-300',
  not_applicable: 'bg-slate-200',
}

const SIZE_CLASSES = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
}

export default function FrameworkStatusDot({ status, size = 'md', label }: FrameworkStatusDotProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('rounded-full', STATUS_COLORS[status], SIZE_CLASSES[size])} />
      {label && <span className="text-xs text-slate-600">{label}</span>}
    </div>
  )
}

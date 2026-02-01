'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  trend?: number
  icon: React.ComponentType<{ className?: string }>
  accentColor?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' | 'violet' | 'blue'
  delay?: number
}

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(startValue + (value - startValue) * easeOut)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{displayValue.toLocaleString()}</span>
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  accentColor = 'slate',
  delay = 0,
}: StatCardProps) {
  const colorMap = {
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-200/40',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      accent: 'bg-emerald-500',
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-200/40',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-100',
      accent: 'bg-amber-500',
    },
    sky: {
      bg: 'from-sky-500/10 to-sky-500/5',
      border: 'border-sky-200/40',
      icon: 'text-sky-600',
      iconBg: 'bg-sky-100',
      accent: 'bg-sky-500',
    },
    blue: {
      bg: 'from-blue-500/10 to-blue-500/5',
      border: 'border-blue-200/40',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      accent: 'bg-blue-500',
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-500/5',
      border: 'border-rose-200/40',
      icon: 'text-rose-600',
      iconBg: 'bg-rose-100',
      accent: 'bg-rose-500',
    },
    violet: {
      bg: 'from-violet-500/10 to-violet-500/5',
      border: 'border-violet-200/40',
      icon: 'text-violet-600',
      iconBg: 'bg-violet-100',
      accent: 'bg-violet-500',
    },
    slate: {
      bg: 'from-slate-500/10 to-slate-500/5',
      border: 'border-slate-200/40',
      icon: 'text-slate-600',
      iconBg: 'bg-slate-100',
      accent: 'bg-slate-500',
    },
  }

  const colors = colorMap[accentColor]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 opacity-0 animate-fade-in-up",
        colors.bg,
        colors.border
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900">
              <AnimatedNumber value={value} duration={800 + delay} />
            </span>
            {trend !== undefined && trend !== 0 && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend > 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5 shadow-sm", colors.iconBg)}>
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>
      </div>

      <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", colors.accent, "opacity-30")} />
    </div>
  )
}

'use client'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-slate-500">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 opacity-0 animate-fade-in-up animation-delay-100" style={{ animationFillMode: 'forwards' }}>
          {children}
        </div>
      )}
    </div>
  )
}

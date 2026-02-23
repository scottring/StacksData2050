'use client'

import { actDefinitions } from '@/lib/vision/mock-data'

interface VisionNavProps {
  currentAct: number
}

export default function VisionNav({ currentAct }: VisionNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-zinc-950/60 border-b border-white/5">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-tight text-emerald-400">STACKS</span>
        <span className="text-xs text-zinc-500 hidden sm:inline">The Vision</span>
      </div>

      {/* Act progress dots */}
      <div className="flex items-center gap-2">
        {actDefinitions.map((act) => (
          <div key={act.id} className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full transition-all duration-500 ${
                currentAct === act.id
                  ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-400/50'
                  : currentAct > act.id
                    ? 'bg-emerald-400/60'
                    : 'bg-zinc-700'
              }`}
            />
            <span
              className={`text-[10px] font-medium uppercase tracking-wider transition-colors duration-500 hidden md:inline ${
                currentAct === act.id ? 'text-emerald-400' : 'text-zinc-600'
              }`}
            >
              {act.subtitle}
            </span>
          </div>
        ))}
      </div>
    </nav>
  )
}

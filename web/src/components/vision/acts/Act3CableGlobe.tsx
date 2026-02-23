'use client'

import FloatingLabel from '../ui/FloatingLabel'
import { Globe2 } from 'lucide-react'

interface Act3Props {
  progress: number
}

export default function Act3CableGlobe({ progress }: Act3Props) {
  const showTitle = progress > 0.05
  const showTagline = progress > 0.45 && progress < 0.85
  const showArrival = progress > 0.8

  // The 3D globe is rendered by VisionCanvas behind this overlay
  // This component only handles text overlays

  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      {/* This section is mostly transparent so the R3F globe shows through */}
      <div className="absolute inset-0 bg-zinc-950/30" />

      {/* Act title */}
      <div className="absolute top-24 left-8 z-20">
        <FloatingLabel text="Act 3" visible={showTitle} variant="subtitle" />
        <FloatingLabel text="The Journey" visible={showTitle} variant="title" className="mt-1" />
      </div>

      {/* Source label (left side) */}
      <div
        className="absolute left-8 top-1/2 -translate-y-1/2 z-20 transition-all duration-700"
        style={{ opacity: progress > 0.1 && progress < 0.7 ? 1 : 0 }}
      >
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Manchester, UK
        </div>
        <div className="text-[10px] text-zinc-600 mt-1">Supplier origin</div>
      </div>

      {/* Destination label (right side) */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 z-20 text-right transition-all duration-700"
        style={{ opacity: showArrival ? 1 : 0 }}
      >
        <div className="flex items-center justify-end gap-2 text-xs font-mono text-emerald-400">
          Stacks Data Layer
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="text-[10px] text-zinc-600 mt-1">Universal format hub</div>
      </div>

      {/* Center tagline */}
      <div className="relative z-20 text-center">
        <div
          className="transition-all duration-700"
          style={{ opacity: showTagline ? 1 : 0, transform: showTagline ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <Globe2 className="h-6 w-6 text-emerald-400/50 mx-auto mb-4" />
          <p className="text-2xl md:text-3xl font-display font-bold text-white">
            One universal format.
          </p>
          <p className="text-2xl md:text-3xl font-display font-bold text-emerald-400">
            Every destination.
          </p>
        </div>
      </div>

      {/* Data particle count indicator */}
      <div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 transition-all duration-500"
        style={{ opacity: progress > 0.2 && progress < 0.9 ? 0.6 : 0 }}
      >
        <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-4">
          <span>CAS identifiers: 3</span>
          <span className="text-zinc-700">|</span>
          <span>Concentrations: 3</span>
          <span className="text-zinc-700">|</span>
          <span>Test results: 4</span>
          <span className="text-zinc-700">|</span>
          <span>Traceability: 4</span>
        </div>
      </div>
    </section>
  )
}

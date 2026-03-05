'use client'

import { outputDocuments } from '@/lib/vision/mock-data'
import FloatingLabel from '../ui/FloatingLabel'
import { FileCheck2, FileJson2, QrCode } from 'lucide-react'

interface Act5Props {
  progress: number
}

const DOC_THRESHOLDS = [0.15, 0.3, 0.45, 0.6]

const DOC_COLORS: Record<string, { border: string; bg: string; accent: string }> = {
  blue:    { border: 'border-blue-500/40',    bg: 'bg-blue-500/5',    accent: 'text-blue-400' },
  red:     { border: 'border-red-500/40',     bg: 'bg-red-500/5',     accent: 'text-red-400' },
  emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', accent: 'text-emerald-400' },
  rose:    { border: 'border-rose-500/40',    bg: 'bg-rose-500/5',    accent: 'text-rose-400' },
}

export default function Act5CustomerOutputs({ progress }: Act5Props) {
  const showTitle = progress > 0.02
  const showChecks = progress > 0.75
  const showTagline = progress > 0.85

  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      {/* Background — warmer, like an office */}
      <div className="absolute inset-0 bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950" />

      {/* Desk surface hint */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl h-32 bg-linear-to-t from-amber-900/5 to-transparent rounded-t-3xl"
        style={{ opacity: showTitle ? 0.4 : 0 }}
      />

      {/* Act title */}
      <div className="absolute top-24 left-8 z-20">
        <FloatingLabel text="Act 5" visible={showTitle} variant="subtitle" />
        <FloatingLabel text="The Delivery" visible={showTitle} variant="title" className="mt-1" />
      </div>

      {/* Document cards */}
      <div className="relative z-10 grid max-w-5xl grid-cols-1 gap-4 px-6 md:grid-cols-2 lg:grid-cols-4">
        {outputDocuments.map((doc, i) => {
          const threshold = DOC_THRESHOLDS[i] || 0.6
          const visible = progress > threshold
          const colors = DOC_COLORS[doc.color] || DOC_COLORS.blue
          const checked = showChecks

          return (
            <div
              key={doc.id}
              className="transition-all duration-700 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible
                  ? 'translateY(0) rotateX(0)'
                  : 'translateY(-40px) rotateX(-10deg)',
                transitionDelay: `${i * 100}ms`,
              }}
            >
              <div className={`relative rounded-xl border ${colors.border} ${colors.bg} p-5 shadow-2xl backdrop-blur-sm`}>
                {/* Format badge */}
                <div className={`absolute top-3 right-3 text-[9px] font-mono px-2 py-0.5 rounded ${colors.bg} ${colors.accent} border ${colors.border}`}>
                  {doc.format}
                </div>

                {/* Flag */}
                <div className="text-2xl mb-3">{doc.flag}</div>

                {/* Title */}
                <div className="text-sm font-bold text-white mb-1">{doc.title}</div>
                <div className="text-[10px] text-zinc-400 leading-relaxed">{doc.subtitle}</div>

                {/* DPP special: show QR code placeholder */}
                {doc.id === 'dpp-credential' && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded border border-emerald-500/30 bg-zinc-800 flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-emerald-400/60" />
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500">
                      <div>GS1 Digital Link</div>
                      <div>https://id.gs1.org/01/...</div>
                    </div>
                  </div>
                )}

                {/* Check mark */}
                <div
                  className="absolute -bottom-2 -right-2 transition-all duration-500"
                  style={{
                    opacity: checked ? 1 : 0,
                    transform: checked ? 'scale(1)' : 'scale(0)',
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50">
                    <FileCheck2 className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tagline */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 text-center">
        <FloatingLabel
          text="Complete. Compliant. Delivered."
          visible={showTagline}
          variant="tagline"
        />
      </div>
    </section>
  )
}

'use client'

import { dataChips, customerCard, chipCategoryColors, type ChipCategory } from '@/lib/vision/mock-data'
import DataChip from '../ui/DataChip'
import FloatingLabel from '../ui/FloatingLabel'
import AmbientParticles from '../ui/AmbientParticles'
import { Zap, CreditCard, FileText, Database, Table, Award } from 'lucide-react'

interface Act2Props {
  progress: number
}

// Document fragments that get "shredded"
const DOC_FRAGMENTS = [
  { label: 'SDS.pdf', icon: FileText, color: 'text-red-400', borderColor: 'border-red-500/40' },
  { label: 'SAP_export.csv', icon: Database, color: 'text-blue-400', borderColor: 'border-blue-500/40' },
  { label: 'lab_results.xlsx', icon: Table, color: 'text-green-400', borderColor: 'border-green-500/40' },
  { label: 'CoA.pdf', icon: Award, color: 'text-amber-400', borderColor: 'border-amber-500/40' },
]

// Chip category labels for organized output
const CATEGORY_LABELS: { category: ChipCategory; label: string }[] = [
  { category: 'identity', label: 'Chemical Identity' },
  { category: 'quantitative', label: 'Quantitative Data' },
  { category: 'safety', label: 'Safety & Hazards' },
  { category: 'compliance', label: 'Test Results' },
  { category: 'traceability', label: 'Traceability' },
]

export default function Act2ChipperMachine({ progress }: Act2Props) {
  // Animation phases
  const showChipper = progress > 0.02
  const showCard = progress > 0.05 && progress < 0.55
  const cardInserted = progress > 0.15
  const showDocsEntering = progress > 0.2 && progress < 0.45
  const machineActive = progress > 0.25
  const showShredding = progress > 0.3 && progress < 0.5
  const showChips = progress > 0.42
  const chipsOrganized = progress > 0.65
  const showCategoryLabels = progress > 0.72
  const showTagline = progress > 0.8
  const formPacket = progress > 0.9

  // Machine shake during activation — tapers off
  const shakeIntensity = machineActive && progress < 0.5
    ? Math.max(0, 1 - (progress - 0.25) / 0.25)
    : 0
  const shakeX = Math.sin(progress * 200) * 3 * shakeIntensity
  const shakeY = Math.cos(progress * 250) * 2 * shakeIntensity

  // Machine glow intensity ramps up then stabilizes
  const glowIntensity = machineActive ? Math.min(1, (progress - 0.25) / 0.15) : 0

  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-zinc-950" />

      {/* Glow when machine is active */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: glowIntensity * 0.15,
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.8), transparent 60%)',
        }}
      />

      <AmbientParticles count={15} color="emerald" />

      {/* Act title */}
      <div className="absolute top-20 left-8 z-20">
        <FloatingLabel text="Act 2" visible={showChipper} variant="subtitle" />
        <FloatingLabel text="The Extraction" visible={showChipper} variant="title" className="mt-1" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6">
        {/* Customer Card */}
        <div
          className="transition-all duration-700 ease-out"
          style={{
            opacity: showCard ? 1 : 0,
            transform: cardInserted
              ? 'translateY(40px) scale(0.75) rotateX(15deg)'
              : 'translateY(0) scale(1)',
            filter: cardInserted ? 'blur(1px)' : 'none',
          }}
        >
          <div className="relative rounded-xl border border-emerald-500/30 bg-zinc-900/90 backdrop-blur-sm px-6 py-4 shadow-2xl shadow-emerald-500/10">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-bold text-white">{customerCard.companyName}</span>
            </div>
            <div className="text-xs text-emerald-400 font-mono">{customerCard.requestType}</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {customerCard.frameworks.map((fw) => (
                <span key={fw} className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] font-mono text-zinc-400">
                  {fw}
                </span>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-zinc-500">
              {customerCard.questionCount} questions &middot; Due {customerCard.dueDate}
            </div>
          </div>
        </div>

        {/* The Chipper Machine — wider, more imposing */}
        <div
          className="relative transition-all duration-300"
          style={{
            opacity: showChipper ? 1 : 0,
            transform: `translate(${shakeX}px, ${shakeY}px)`,
          }}
        >
          {/* Document fragments entering from left */}
          <div className="absolute -left-32 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {DOC_FRAGMENTS.map((doc, i) => {
              const entering = showDocsEntering && progress > 0.22 + i * 0.04
              const consumed = progress > 0.35 + i * 0.03
              const Icon = doc.icon
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 rounded border px-2 py-1 bg-zinc-900/80 transition-all duration-500 ${doc.borderColor}`}
                  style={{
                    opacity: entering && !consumed ? 1 : 0,
                    transform: consumed
                      ? 'translateX(120px) scaleX(0) scaleY(0.3)'
                      : entering
                        ? 'translateX(0) scaleX(1) scaleY(1)'
                        : 'translateX(-30px)',
                  }}
                >
                  <Icon className={`h-3 w-3 ${doc.color}`} />
                  <span className="text-[9px] font-mono text-zinc-400">{doc.label}</span>
                </div>
              )
            })}
          </div>

          <div className="relative w-96 h-52 rounded-2xl border-2 bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden shadow-2xl"
            style={{
              borderColor: machineActive ? `rgba(16,185,129,${0.2 + glowIntensity * 0.4})` : 'rgba(63,63,70,1)',
            }}
          >
            {/* Shredding visual inside machine */}
            {showShredding && (
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"
                    style={{
                      top: `${20 + i * 8}%`,
                      left: '20%',
                      right: '20%',
                      animation: `dataFlow ${0.8 + i * 0.1}s ease-in-out ${i * 0.05}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Machine body */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Zap
                  className={`h-10 w-10 mx-auto mb-2 transition-all duration-300 ${
                    machineActive ? 'text-emerald-400' : 'text-zinc-600'
                  }`}
                  style={{
                    filter: machineActive ? `drop-shadow(0 0 ${8 + glowIntensity * 12}px rgba(16,185,129,0.5))` : 'none',
                  }}
                />
                <div className={`text-xs font-mono uppercase tracking-wider transition-colors duration-300 ${
                  machineActive ? 'text-emerald-400' : 'text-zinc-600'
                }`}>
                  {showChips ? 'Extraction complete' : machineActive ? 'Processing...' : 'Awaiting input'}
                </div>
                {machineActive && !showChips && (
                  <div className="mt-2 w-32 h-1 bg-zinc-700 rounded-full overflow-hidden mx-auto">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((progress - 0.25) / 0.17) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Input slot (left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-3 h-20 bg-zinc-700 rounded-r-lg">
              <div
                className="absolute inset-0 bg-emerald-500/30 rounded-r-lg transition-opacity duration-300"
                style={{ opacity: showDocsEntering ? 1 : 0 }}
              />
            </div>

            {/* Output slot (right) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-3 h-20 bg-zinc-700 rounded-l-lg">
              <div
                className="absolute inset-0 bg-emerald-500/50 rounded-l-lg transition-opacity duration-500"
                style={{ opacity: showChips ? 1 : 0 }}
              />
            </div>

            {/* Activity indicator lights */}
            <div className="absolute top-3 right-3 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                    machineActive ? 'bg-emerald-400' : 'bg-zinc-700'
                  }`}
                  style={{
                    animation: machineActive ? `glowPulse 1s ease-in-out ${i * 0.2}s infinite` : 'none',
                  }}
                />
              ))}
            </div>

            {/* Machine label */}
            <div className="absolute bottom-3 left-3 text-[8px] font-mono text-zinc-600 uppercase tracking-wider">
              Stacks Extraction Engine v2.1
            </div>
          </div>
        </div>

        {/* Data Chips Output — organized by category when settled */}
        <div
          className="relative transition-all duration-700"
          style={{ opacity: showChips ? 1 : 0 }}
        >
          {chipsOrganized ? (
            // Organized by category
            <div className="flex flex-col gap-2 max-w-3xl">
              {CATEGORY_LABELS.map(({ category, label }, catIdx) => {
                const chips = dataChips.filter(c => c.category === category)
                const colors = chipCategoryColors[category]
                return (
                  <div key={category} className="flex items-start gap-3">
                    {/* Category label */}
                    <div
                      className="w-28 shrink-0 text-right transition-all duration-500"
                      style={{
                        opacity: showCategoryLabels ? 1 : 0,
                        transform: showCategoryLabels ? 'translateX(0)' : 'translateX(-10px)',
                        transitionDelay: `${catIdx * 80}ms`,
                      }}
                    >
                      <span className={`text-[9px] font-mono ${colors.text}`}>{label}</span>
                    </div>
                    {/* Chips */}
                    <div className="flex flex-wrap gap-1">
                      {chips.map((chip, i) => (
                        <div
                          key={i}
                          className="transition-all duration-500"
                          style={{
                            transform: formPacket ? 'scale(0.9)' : 'scale(1)',
                            transitionDelay: `${i * 30}ms`,
                          }}
                        >
                          <DataChip chip={chip} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Chaotic — flying out
            <div className="flex flex-wrap justify-center gap-1.5 max-w-2xl">
              {dataChips.map((chip, i) => {
                const chaos = 1 - Math.min(1, (progress - 0.42) / 0.23)
                const randomX = Math.sin(i * 7.3) * chaos * 80
                const randomY = Math.cos(i * 5.1) * chaos * 50
                const randomRotate = Math.sin(i * 3.7) * chaos * 20

                return (
                  <div
                    key={i}
                    className="transition-all duration-400"
                    style={{
                      transform: `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg)`,
                      transitionDelay: `${i * 15}ms`,
                      opacity: progress > 0.42 + (i * 0.008) ? 1 : 0,
                    }}
                  >
                    <DataChip chip={chip} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tagline */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 text-center">
        <FloatingLabel
          text="Extracted. Normalized. Machine-readable."
          visible={showTagline}
          variant="tagline"
        />
      </div>
    </section>
  )
}

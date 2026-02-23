'use client'

import { regulatoryLanes, dataChips, type RegulatoryLaneData, type RegulatoryField } from '@/lib/vision/mock-data'
import FloatingLabel from '../ui/FloatingLabel'
import DataChip from '../ui/DataChip'
import AmbientParticles from '../ui/AmbientParticles'
import { Shield, CheckCircle2, Info, AlertTriangle, Zap } from 'lucide-react'

interface Act4Props {
  progress: number
}

// Each lane activates sequentially
const LANE_THRESHOLDS = [0.15, 0.3, 0.45, 0.55, 0.65, 0.78]

function StatusIcon({ status }: { status: RegulatoryField['status'] }) {
  switch (status) {
    case 'pass': return <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
    case 'info': return <Info className="h-3 w-3 text-blue-400 shrink-0" />
    case 'warning': return <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
  }
}

const LANE_COLORS: Record<string, { border: string; bg: string; glow: string; accent: string }> = {
  blue:    { border: 'border-blue-500/40',    bg: 'bg-blue-500/5',    glow: 'shadow-blue-500/20',    accent: 'bg-blue-500' },
  red:     { border: 'border-red-500/40',     bg: 'bg-red-500/5',     glow: 'shadow-red-500/20',     accent: 'bg-red-500' },
  rose:    { border: 'border-rose-500/40',    bg: 'bg-rose-500/5',    glow: 'shadow-rose-500/20',    accent: 'bg-rose-500' },
  sky:     { border: 'border-sky-500/40',     bg: 'bg-sky-500/5',     glow: 'shadow-sky-500/20',     accent: 'bg-sky-500' },
  emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', glow: 'shadow-emerald-500/20', accent: 'bg-emerald-500' },
  amber:   { border: 'border-amber-500/40',   bg: 'bg-amber-500/5',   glow: 'shadow-amber-500/20',   accent: 'bg-amber-500' },
}

function RegulatoryLane({ lane, active, fieldProgress }: {
  lane: RegulatoryLaneData
  active: boolean
  fieldProgress: number
}) {
  const colors = LANE_COLORS[lane.color] || LANE_COLORS.blue
  const visibleFields = Math.ceil(fieldProgress * lane.fields.length)

  return (
    <div
      className={`relative rounded-lg border overflow-hidden transition-all duration-700 ${
        active
          ? `${colors.border} ${colors.bg} shadow-lg ${colors.glow}`
          : 'border-zinc-800/50 bg-zinc-900/30'
      }`}
    >
      {/* Top accent bar that fills as fields populate */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800">
        <div
          className={`h-full ${colors.accent} transition-all duration-1000 ease-out`}
          style={{ width: `${fieldProgress * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50">
        <span className="text-lg">{lane.flag}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold transition-colors duration-500 ${active ? 'text-white' : 'text-zinc-600'}`}>
            {lane.name}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">{lane.region}</div>
        </div>
        {/* Animated status */}
        <div className="flex items-center gap-1.5">
          {active && fieldProgress >= 1 && (
            <span className="text-[9px] font-mono text-emerald-400 animate-fade-in-up">READY</span>
          )}
          <div
            className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${
              active
                ? fieldProgress >= 1
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                  : 'bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50'
                : 'bg-zinc-700'
            }`}
          />
        </div>
      </div>

      {/* Fields with staggered reveal */}
      <div className="px-4 py-2 space-y-1.5">
        {lane.fields.map((field, i) => (
          <div
            key={i}
            className="flex items-start gap-2 transition-all duration-500"
            style={{
              opacity: i < visibleFields ? 1 : 0,
              transform: i < visibleFields ? 'translateX(0)' : 'translateX(-20px)',
              transitionDelay: `${i * 120}ms`,
            }}
          >
            <StatusIcon status={field.status} />
            <div className="min-w-0">
              <span className="text-[10px] text-zinc-500 font-mono">{field.label}: </span>
              <span className="text-[10px] text-zinc-300">{field.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Act4StacksIntelligence({ progress }: Act4Props) {
  const showTitle = progress > 0.02
  const showIncoming = progress > 0.05 && progress < 0.25
  const showLanes = progress > 0.1
  const showTagline = progress > 0.9

  // Count completed lanes
  const completedLanes = LANE_THRESHOLDS.filter((t, i) => {
    const fieldProgress = progress > t ? Math.min(1, (progress - t) / 0.12) : 0
    return fieldProgress >= 1
  }).length

  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-zinc-950" />

      {/* Circuit pattern */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.025 + (progress * 0.02),
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Intensifying glow as lanes complete */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: completedLanes * 0.03,
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.15), transparent 70%)',
        }}
      />

      {/* Scan line effect */}
      {showLanes && progress < 0.9 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none vision-scan-line" />
      )}

      <AmbientParticles count={20} color="emerald" />

      {/* Act title */}
      <div className="absolute top-20 left-8 z-20">
        <FloatingLabel text="Act 4" visible={showTitle} variant="subtitle" />
        <FloatingLabel text="The Intelligence" visible={showTitle} variant="title" className="mt-1" />
      </div>

      {/* Stacks badge */}
      <div
        className="absolute top-20 right-8 z-20 transition-all duration-700"
        style={{ opacity: showTitle ? 1 : 0 }}
      >
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono text-emerald-400">Stacks Data Layer</span>
          <Zap className={`h-3 w-3 transition-colors duration-300 ${progress > 0.15 ? 'text-emerald-400 animate-pulse' : 'text-zinc-600'}`} />
        </div>
      </div>

      {/* Incoming data chips (brief flash before lanes start) */}
      <div
        className="absolute top-36 left-1/2 -translate-x-1/2 z-20 transition-all duration-500"
        style={{ opacity: showIncoming ? 0.7 : 0 }}
      >
        <div className="flex flex-wrap justify-center gap-1 max-w-md">
          {dataChips.slice(0, 8).map((chip, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                opacity: progress > 0.06 + i * 0.015 ? 1 : 0,
                transform: `translateY(${progress > 0.06 + i * 0.015 ? 0 : -10}px)`,
              }}
            >
              <DataChip chip={chip} className="text-[8px] px-1.5 py-0" />
            </div>
          ))}
        </div>
        <div className="text-center mt-2 text-[9px] font-mono text-zinc-500">
          Incoming normalized data...
        </div>
      </div>

      {/* Regulatory lanes grid */}
      <div
        className="relative z-10 w-full max-w-6xl px-6 mt-8 transition-all duration-700"
        style={{ opacity: showLanes ? 1 : 0 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {regulatoryLanes.map((lane, i) => {
            const threshold = LANE_THRESHOLDS[i] || 0.9
            const active = progress > threshold
            const fieldProgress = active
              ? Math.min(1, (progress - threshold) / 0.12)
              : 0

            return (
              <div
                key={lane.id}
                className="transition-all duration-700"
                style={{
                  opacity: active ? 1 : (showLanes ? 0.4 : 0),
                  transform: active ? 'scale(1)' : 'scale(0.97)',
                }}
              >
                <RegulatoryLane
                  lane={lane}
                  active={active}
                  fieldProgress={fieldProgress}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-3xl px-6">
        {/* Progress bar */}
        <div
          className="h-1 rounded-full bg-zinc-800 mb-4 overflow-hidden transition-opacity duration-500"
          style={{ opacity: showLanes ? 1 : 0 }}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${(completedLanes / 6) * 100}%` }}
          />
        </div>

        {/* Lane indicators */}
        <div
          className="flex items-center justify-center gap-3 transition-all duration-500"
          style={{ opacity: showLanes ? 1 : 0 }}
        >
          {regulatoryLanes.map((lane, i) => {
            const active = progress > (LANE_THRESHOLDS[i] || 0.9)
            const complete = active && Math.min(1, (progress - (LANE_THRESHOLDS[i] || 0.9)) / 0.12) >= 1
            return (
              <div key={lane.id} className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                  complete ? 'bg-emerald-400' : active ? 'bg-amber-400 animate-pulse' : 'bg-zinc-700'
                }`} />
                <span className={`text-[9px] font-mono transition-colors duration-500 ${
                  complete ? 'text-emerald-400' : active ? 'text-amber-400' : 'text-zinc-600'
                }`}>
                  {lane.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tagline */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-center">
        <FloatingLabel
          text="6 frameworks. 0 manual entry."
          visible={showTagline}
          variant="tagline"
        />
      </div>
    </section>
  )
}

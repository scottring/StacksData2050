'use client'

import { ChevronDown } from 'lucide-react'
import AmbientParticles from '../ui/AmbientParticles'

interface HeroSectionProps {
  progress: number
}

const STATS = [
  { value: '47', label: 'Questions per request' },
  { value: '12+', label: 'Formats to juggle' },
  { value: '6', label: 'Regulatory frameworks' },
  { value: '0', label: 'Manual rework with Stacks' },
]

export default function HeroSection({ progress }: HeroSectionProps) {
  const fadeOut = Math.max(0, 1 - progress * 2.5)
  const parallax = progress * -80

  return (
    <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden">
      {/* Deep dark background */}
      <div className="absolute inset-0 bg-zinc-950" />

      {/* Radial gradient layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_120%,rgba(16,185,129,0.06),transparent)]" />

      {/* Grid pattern with parallax */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          transform: `translateY(${progress * 30}px)`,
        }}
      />

      {/* Ambient particles */}
      <AmbientParticles count={40} color="emerald" />

      {/* Horizontal scan lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[0.2, 0.5, 0.8].map((pos, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent animate-data-flow"
            style={{
              top: `${pos * 100}%`,
              opacity: fadeOut * 0.5,
              animationDuration: `${6 + i * 2}s`,
              animationDelay: `${i * -2}s`,
            }}
          />
        ))}
      </div>

      <div
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-5xl"
        style={{ opacity: fadeOut, transform: `translateY(${parallax}px)` }}
      >
        {/* Logo badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono tracking-[0.2em] uppercase text-emerald-400/90">
            Stacks Data &mdash; The Vision
          </span>
        </div>

        {/* Main title  */}
        <h1 className="font-display text-5xl leading-[1.1] font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
          <span className="block opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            One Product.
          </span>
          <span className="block text-emerald-400 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            Every Format.
          </span>
          <span className="block opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            Zero Rework.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-2xl text-base text-zinc-400 md:text-lg opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}
        >
          Watch a single supplier transform 4 source documents into
          compliance-ready outputs for 6 regulatory frameworks &mdash;
          including the new EU Digital Product Passport &mdash; automatically.
        </p>

        {/* Stats bar */}
        <div
          className="mt-4 flex flex-wrap justify-center gap-6 md:gap-10 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '1.1s', animationFillMode: 'forwards' }}
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className={`text-2xl font-bold font-mono ${stat.value === '0' ? 'text-emerald-400' : 'text-white'}`}>
                {stat.value}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div
          className="mt-4 h-px w-32 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 animate-fade-in-up"
          style={{ animationDelay: '1.4s', animationFillMode: 'forwards' }}
        />

        {/* Scroll indicator */}
        <div
          className="mt-6 flex flex-col items-center gap-2 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '1.6s', animationFillMode: 'forwards' }}
        >
          <span className="text-[10px] font-mono tracking-[0.15em] text-zinc-600 uppercase">
            Scroll to begin the journey
          </span>
          <div className="flex flex-col items-center animate-bounce">
            <ChevronDown className="h-4 w-4 text-zinc-600" />
            <ChevronDown className="h-4 w-4 text-zinc-700 -mt-2" />
          </div>
        </div>
      </div>
    </section>
  )
}

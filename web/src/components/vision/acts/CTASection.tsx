'use client'

import { ArrowRight, Mail } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden px-6 py-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950" />

      {/* Emerald glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* Logo mark */}
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-emerald-400">S</span>
        </div>

        <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
          Ready to eliminate rework?
        </h2>

        <p className="max-w-lg text-zinc-400">
          Stop filling out the same compliance data in 12 different formats.
          Let Stacks do it once, deliver everywhere.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <a
            href="/demo/compliance"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            See Live Demo
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="mailto:scott@stacksdata.com"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
          >
            <Mail className="h-4 w-4" />
            Contact Us
          </a>
        </div>

        <p className="text-[10px] text-zinc-600 font-mono mt-8">
          STACKS DATA &middot; Supply chain compliance, unified.
        </p>
      </div>
    </section>
  )
}

'use client'

import dynamic from 'next/dynamic'
import ScrollController, { useActProgress } from './ScrollController'
import HeroSection from './acts/HeroSection'
import Act1SupplierIsland from './acts/Act1SupplierIsland'
import Act2ChipperMachine from './acts/Act2ChipperMachine'
import Act3CableGlobe from './acts/Act3CableGlobe'
import Act4StacksIntelligence from './acts/Act4StacksIntelligence'
import Act5CustomerOutputs from './acts/Act5CustomerOutputs'
import CTASection from './acts/CTASection'
import VisionNav from './VisionNav'
import VisionMobilePage from './VisionMobilePage'
import { useIsMobile } from './hooks/useIsMobile'

const VisionCanvas = dynamic(() => import('./three/VisionCanvas'), { ssr: false })

function ActTransition({ progress, fromAct, toAct }: { progress: number; fromAct: number; toAct: number }) {
  // Shows a brief emerald flash between acts at the transition point
  const isTransitioning = progress > 0.92
  if (!isTransitioning) return null

  const opacity = Math.max(0, (progress - 0.92) / 0.08) * 0.15

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 bg-emerald-500"
      style={{ opacity }}
    />
  )
}

function VisionDesktopContent() {
  const progress = useActProgress()

  return (
    <>
      {/* Floating nav */}
      <VisionNav currentAct={progress.currentAct} />

      {/* 3D Canvas — fixed behind everything */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <VisionCanvas progress={progress} />
      </div>

      {/* Scrollable content overlaid on canvas */}
      <div className="relative z-10">
        {/* Hero — not pinned */}
        <div data-act="hero">
          <HeroSection progress={progress.hero} />
        </div>

        {/* Act 1: Supplier Island */}
        <div data-act="act1" className="relative">
          <Act1SupplierIsland progress={progress.act1} />
          <ActTransition progress={progress.act1} fromAct={1} toAct={2} />
        </div>

        {/* Act 2: The Chipper */}
        <div data-act="act2" className="relative">
          <Act2ChipperMachine progress={progress.act2} />
          <ActTransition progress={progress.act2} fromAct={2} toAct={3} />
        </div>

        {/* Act 3: Cable & Globe */}
        <div data-act="act3" className="relative">
          <Act3CableGlobe progress={progress.act3} />
          <ActTransition progress={progress.act3} fromAct={3} toAct={4} />
        </div>

        {/* Act 4: Stacks Intelligence Layer */}
        <div data-act="act4" className="relative">
          <Act4StacksIntelligence progress={progress.act4} />
          <ActTransition progress={progress.act4} fromAct={4} toAct={5} />
        </div>

        {/* Act 5: Customer Outputs */}
        <div data-act="act5" className="relative">
          <Act5CustomerOutputs progress={progress.act5} />
        </div>

        {/* CTA — not pinned */}
        <CTASection />
      </div>
    </>
  )
}

export default function VisionPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <VisionMobilePage />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <ScrollController>
        <VisionDesktopContent />
      </ScrollController>
    </div>
  )
}

'use client'

import dynamic from 'next/dynamic'
import CommandTopBar from './CommandTopBar'

const AmbientParticles = dynamic(
  () => import('@/components/vision/ui/AmbientParticles'),
  { ssr: false }
)

interface CommandLayoutProps {
  children: React.ReactNode
}

export default function CommandLayout({ children }: CommandLayoutProps) {
  return (
    <div className="dark">
      <div className="relative min-h-screen bg-zinc-950 text-white overflow-hidden">
        {/* Ambient background particles */}
        <AmbientParticles count={20} />

        {/* Subtle radial gradient behind globe area */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)]" />

        {/* Top bar */}
        <CommandTopBar />

        {/* Main content */}
        <main className="relative z-10 pt-14">
          {children}
        </main>
      </div>
    </div>
  )
}

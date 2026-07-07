'use client'

import { Suspense, useEffect } from 'react'
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
  // Shared with StationLayout's identical effect: both toggle the same
  // global `body.dark` class with no refcounting, so these two dark layouts
  // must never be mounted nested inside one another (the unmount of either
  // would strip `dark` out from under the other).
  useEffect(() => {
    document.body.classList.add('dark')
    return () => document.body.classList.remove('dark')
  }, [])

  return (
    <div className="dark">
      <div className="relative min-h-screen bg-zinc-950 text-white overflow-hidden">
        {/* Ambient background particles */}
        <AmbientParticles count={20} />

        {/* Subtle radial gradient behind globe area */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)]" />

        {/* Top bar */}
        <Suspense fallback={null}>
          <CommandTopBar />
        </Suspense>

        {/* Main content */}
        <main className="relative z-10 pt-14">
          {children}
        </main>
      </div>
    </div>
  )
}

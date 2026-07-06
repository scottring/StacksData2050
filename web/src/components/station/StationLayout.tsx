'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, Globe2, FileSpreadsheet } from 'lucide-react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const AmbientParticles = dynamic(
  () => import('@/components/vision/ui/AmbientParticles'),
  { ssr: false }
)

interface StationLayoutProps {
  children: React.ReactNode
}

export default function StationLayout({ children }: StationLayoutProps) {
  const pathname = usePathname()

  useEffect(() => {
    document.body.classList.add('dark')
    return () => document.body.classList.remove('dark')
  }, [])

  return (
    <div className="dark">
      <div className="relative min-h-screen bg-zinc-950 text-white">
        {/* Ambient background */}
        <AmbientParticles count={12} />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.02)_0%,transparent_70%)]" />

        <div className="flex h-screen">
          {/* Left sidebar - request list */}
          <aside className="flex w-72 flex-col border-r border-white/6 bg-zinc-900/50 backdrop-blur-sm">
            {/* Logo */}
            <div className="flex h-14 items-center border-b border-white/6 px-5">
              <Link href="/station" className="flex items-center gap-2.5 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Globe2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <span className="font-display text-base font-semibold text-white tracking-tight">
                    Stax<span className="text-emerald-400">Data</span>
                  </span>
                  <span className="block text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                    Processing Station
                  </span>
                </div>
              </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <Link
                href="/station"
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  pathname === '/station'
                    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/4'
                )}
              >
                <Inbox className="h-4 w-4" />
                <span>Pending Requests</span>
              </Link>
              <Link
                href="/station/ingest"
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  pathname?.startsWith('/station/ingest')
                    ? 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/4'
                )}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Import External</span>
              </Link>
            </nav>
          </aside>

          {/* Main workspace */}
          <main className="relative z-10 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

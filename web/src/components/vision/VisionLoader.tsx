'use client'

import dynamic from 'next/dynamic'

function VisionLoadingSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-500" />
        <p className="font-display text-xl text-zinc-400">Loading the vision...</p>
      </div>
    </div>
  )
}

const VisionPage = dynamic(() => import('./VisionPage'), {
  ssr: false,
  loading: () => <VisionLoadingSkeleton />,
})

export default function VisionLoader() {
  return <VisionPage />
}

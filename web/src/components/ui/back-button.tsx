'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  fallbackUrl?: string
  className?: string
}

export function BackButton({ fallbackUrl = '/sheets', className }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackUrl)
    }
  }

  return (
    <button 
      onClick={handleBack}
      className={className || 'text-muted-foreground hover:text-foreground'}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  )
}

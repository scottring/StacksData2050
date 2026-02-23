'use client'

import { useRef, useCallback, createContext, useContext, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { type ActProgressState, initialActProgress } from '@/lib/vision/scroll-config'

gsap.registerPlugin(ScrollTrigger)

const ScrollContext = createContext<ActProgressState>(initialActProgress)

export function useActProgress() {
  return useContext(ScrollContext)
}

interface ScrollControllerProps {
  children: React.ReactNode
}

export default function ScrollController({ children }: ScrollControllerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState<ActProgressState>(initialActProgress)

  const updateProgress = useCallback((act: keyof ActProgressState, value: number) => {
    setProgress(prev => {
      if (prev[act] === value) return prev
      return { ...prev, [act]: value }
    })
  }, [])

  useGSAP(() => {
    if (!containerRef.current) return

    const acts = containerRef.current.querySelectorAll<HTMLElement>('[data-act]')

    acts.forEach((actEl) => {
      const actId = actEl.dataset.act as string
      const scrubDistance = actId === 'act4' ? '+=150%' : '+=100%'

      ScrollTrigger.create({
        trigger: actEl,
        start: 'top top',
        end: scrubDistance,
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          updateProgress(actId as keyof ActProgressState, Math.round(self.progress * 1000) / 1000)
        },
        onEnter: () => {
          const actNum = parseInt(actId.replace('act', ''))
          if (!isNaN(actNum)) {
            updateProgress('currentAct', actNum)
          }
        },
        onEnterBack: () => {
          const actNum = parseInt(actId.replace('act', ''))
          if (!isNaN(actNum)) {
            updateProgress('currentAct', actNum)
          }
        },
      })
    })

    // Hero section (not pinned, just tracks progress)
    const heroEl = containerRef.current.querySelector<HTMLElement>('[data-act="hero"]')
    if (heroEl) {
      ScrollTrigger.create({
        trigger: heroEl,
        start: 'top top',
        end: 'bottom top',
        onUpdate: (self) => {
          updateProgress('hero', Math.round(self.progress * 1000) / 1000)
        },
        onEnter: () => updateProgress('currentAct', 0),
        onEnterBack: () => updateProgress('currentAct', 0),
      })
    }
  }, { scope: containerRef })

  return (
    <ScrollContext.Provider value={progress}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </ScrollContext.Provider>
  )
}

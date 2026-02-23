'use client'

import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei'
import { Suspense } from 'react'
import Globe from './Globe'
import CableSystem from './CableSystem'
import DataParticles from './DataParticles'
import PostProcessing from './PostProcessing'
import { type ActProgressState } from '@/lib/vision/scroll-config'

interface VisionCanvasProps {
  progress: ActProgressState
}

export default function VisionCanvas({ progress }: VisionCanvasProps) {
  const showGlobe = progress.currentAct >= 3 && progress.currentAct <= 4

  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-5, -3, 5]} intensity={0.3} color="#10b981" />

      <Suspense fallback={null}>
        <Globe
          visible={showGlobe}
          progress={progress.act3}
          opacity={showGlobe ? 1 : 0}
        />
        <CableSystem
          visible={showGlobe}
          progress={progress.act3}
        />
        <DataParticles
          visible={showGlobe && progress.act3 > 0.15}
          progress={progress.act3}
        />
        <PostProcessing currentAct={progress.currentAct} />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}

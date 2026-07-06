'use client'

import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import InteractiveGlobe from './three/InteractiveGlobe'
import CompanyNodes from './three/CompanyNodes'
import RequestArcs from './three/RequestArcs'
import StatusParticles from './three/StatusParticles'
import type { CompanyNode, RequestArc } from '@/lib/geo'
import { Globe2 } from 'lucide-react'

interface CommandCanvasProps {
  companies: CompanyNode[]
  requests: RequestArc[]
  selectedNodeId: string | null
  selectedArcId: string | null
  onNodeClick: (id: string) => void
  dimmed?: boolean
}

function WebGLFallback() {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center bg-zinc-950">
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-emerald-500/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe2 className="h-12 w-12 text-emerald-500/40" />
          </div>
        </div>
        <p className="text-sm text-zinc-600 font-mono">
          WebGL unavailable — enable hardware acceleration in browser settings
        </p>
      </div>
    </div>
  )
}

export default function CommandCanvas({
  companies,
  requests,
  selectedNodeId,
  selectedArcId,
  onNodeClick,
  dimmed = false,
}: CommandCanvasProps) {
  const [webglAvailable, setWebglAvailable] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) setWebglAvailable(false)
    } catch {
      setWebglAvailable(false)
    }
  }, [])

  if (!webglAvailable) {
    return <WebGLFallback />
  }

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 16], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          if (!gl) setWebglAvailable(false)
        }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 3, 5]} intensity={0.8} />
          <pointLight position={[-5, -3, 5]} intensity={0.3} color="#10b981" />

          {/* Globe */}
          <InteractiveGlobe dimmed={dimmed} />

          {/* Data layers */}
          <CompanyNodes
            companies={companies}
            selectedId={selectedNodeId}
            onNodeClick={onNodeClick}
          />
          <RequestArcs
            arcs={requests}
            companies={companies}
            selectedArcId={selectedArcId}
          />
          <StatusParticles
            arcs={requests}
            companies={companies}
          />

          {/* Controls */}
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minDistance={10}
            maxDistance={20}
            autoRotate={!selectedNodeId}
            autoRotateSpeed={0.3}
            dampingFactor={0.05}
            enableDamping
          />

          {/* Post-processing */}
          <EffectComposer>
            <Bloom
              intensity={1.0}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
            <Vignette offset={0.3} darkness={0.7} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}

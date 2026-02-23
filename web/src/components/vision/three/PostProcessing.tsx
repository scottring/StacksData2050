'use client'

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

interface PostProcessingProps {
  currentAct: number
}

export default function PostProcessing({ currentAct }: PostProcessingProps) {
  // Bloom intensity peaks during Act 3 (globe) and Act 4 (sorting)
  const bloomIntensity = currentAct === 3 ? 1.2 : currentAct === 4 ? 0.8 : 0.4

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette offset={0.3} darkness={0.7} />
    </EffectComposer>
  )
}

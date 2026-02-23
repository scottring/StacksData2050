'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CableSystemProps {
  visible: boolean
  progress: number
}

export default function CableSystem({ visible, progress }: CableSystemProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const currentProgress = useRef(0)

  // Cable path: arc from supplier point to Stacks hub across the globe
  const { geometry, material } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6, 0, 3),    // Supplier (Manchester, UK-ish)
      new THREE.Vector3(-4, 1.5, 4),  // Rise above globe
      new THREE.Vector3(-1, 2.5, 4.5),// Peak of arc
      new THREE.Vector3(2, 2, 4),     // Descending
      new THREE.Vector3(5, 0.5, 3),   // Approaching Stacks hub
      new THREE.Vector3(6, 0, 2.5),   // Stacks hub arrival
    ])

    const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.06, 8, false)

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float tubeProgress;
        varying float vProgress;
        varying vec3 vPosition;
        void main() {
          vProgress = position.x; // approximate progress along tube
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uDrawProgress;
        uniform float uOpacity;
        varying vec3 vPosition;
        void main() {
          // Map x position to 0-1 range (-6 to 6 = 12 units)
          float normalizedX = (vPosition.x + 6.0) / 12.0;

          // Only show parts of the cable that have been "drawn"
          if (normalizedX > uDrawProgress) discard;

          // Glow effect at the leading edge
          float edgeDist = uDrawProgress - normalizedX;
          float glow = smoothstep(0.0, 0.08, edgeDist);
          float edgeGlow = 1.0 - smoothstep(0.0, 0.03, edgeDist);

          vec3 baseColor = vec3(0.06, 0.73, 0.51); // emerald
          vec3 glowColor = vec3(0.2, 1.0, 0.7);
          vec3 color = mix(glowColor, baseColor, glow);

          float alpha = glow * uOpacity + edgeGlow * 0.5;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uDrawProgress: { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    return { geometry: tubeGeo, material: mat }
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Smooth progress interpolation
    const targetProgress = visible ? progress : 0
    currentProgress.current += (targetProgress - currentProgress.current) * delta * 4

    // Map scroll progress (0.15-0.8) to draw progress (0-1)
    const drawProgress = Math.max(0, Math.min(1, (currentProgress.current - 0.15) / 0.65))
    material.uniforms.uDrawProgress.value = drawProgress
    material.uniforms.uOpacity.value = visible ? Math.min(1, currentProgress.current * 5) : 0
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} visible={visible} />
  )
}

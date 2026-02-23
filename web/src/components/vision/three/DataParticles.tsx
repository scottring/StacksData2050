'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DataParticlesProps {
  visible: boolean
  progress: number
}

const PARTICLE_COUNT = 40

export default function DataParticles({ visible, progress }: DataParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Cable path points (same curve as CableSystem)
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6, 0, 3),
    new THREE.Vector3(-4, 1.5, 4),
    new THREE.Vector3(-1, 2.5, 4.5),
    new THREE.Vector3(2, 2, 4),
    new THREE.Vector3(5, 0.5, 3),
    new THREE.Vector3(6, 0, 2.5),
  ]), [])

  // Particle offsets for staggered movement
  const offsets = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      offset: i / PARTICLE_COUNT,
      speed: 0.8 + Math.random() * 0.4,
      size: 0.03 + Math.random() * 0.04,
      colorIndex: Math.floor(Math.random() * 5), // 5 chip color categories
    }))
  }, [])

  const colors = useMemo(() => [
    new THREE.Color('#10b981'), // emerald - identity
    new THREE.Color('#3b82f6'), // blue - quantitative
    new THREE.Color('#f59e0b'), // amber - safety
    new THREE.Color('#8b5cf6'), // violet - compliance
    new THREE.Color('#f43f5e'), // rose - traceability
  ], [])

  useFrame((state) => {
    if (!meshRef.current || !visible) return

    const time = state.clock.elapsedTime

    // Map scroll progress to cable draw position
    const drawProgress = Math.max(0, Math.min(1, (progress - 0.15) / 0.65))

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const { offset, speed, size, colorIndex } = offsets[i]

      // Particles flow along the cable, but only up to the draw progress
      const particleT = ((time * speed * 0.15 + offset) % 1)
      const t = Math.min(particleT, drawProgress)

      if (t <= 0.001 || drawProgress < 0.01) {
        // Hide particle
        dummy.scale.set(0, 0, 0)
      } else {
        const pos = curve.getPointAt(t)

        // Add slight wobble
        const wobble = Math.sin(time * 2 + i) * 0.08
        dummy.position.set(pos.x + wobble, pos.y + wobble * 0.5, pos.z)

        // Pulse size
        const pulse = 1 + Math.sin(time * 3 + i) * 0.3
        dummy.scale.set(size * pulse, size * pulse, size * pulse)
      }

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      meshRef.current.setColorAt(i, colors[colorIndex])
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} visible={visible}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        emissive="#10b981"
        emissiveIntensity={2}
        toneMapped={false}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  )
}

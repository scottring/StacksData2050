'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { latLngToSphere, arcBetween, STATUS_COLORS, type CompanyNode, type RequestArc } from '@/lib/geo'

interface StatusParticlesProps {
  arcs: RequestArc[]
  companies: CompanyNode[]
}

const PARTICLES_PER_ARC = 8
const MAX_ARCS_WITH_PARTICLES = 20

export default function StatusParticles({ arcs, companies }: StatusParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const companyMap = useMemo(() => {
    const map = new Map<string, CompanyNode>()
    companies.forEach((c) => map.set(c.id, c))
    return map
  }, [companies])

  // Only animate particles on active (non-complete) arcs, limited to MAX
  const activeArcs = useMemo(() => {
    return arcs
      .filter((a) => a.status !== 'complete')
      .slice(0, MAX_ARCS_WITH_PARTICLES)
  }, [arcs])

  const curves = useMemo(() => {
    return activeArcs.map((arc) => {
      const from = companyMap.get(arc.fromCompanyId)
      const to = companyMap.get(arc.toCompanyId)
      if (!from || !to) return null
      return {
        curve: arcBetween(
          latLngToSphere(from.latitude, from.longitude),
          latLngToSphere(to.latitude, to.longitude)
        ),
        color: STATUS_COLORS[arc.status],
      }
    }).filter(Boolean) as { curve: THREE.CatmullRomCurve3; color: THREE.Color }[]
  }, [activeArcs, companyMap])

  const totalParticles = curves.length * PARTICLES_PER_ARC

  const offsets = useMemo(() => {
    return Array.from({ length: totalParticles }, (_, i) => ({
      offset: (i % PARTICLES_PER_ARC) / PARTICLES_PER_ARC,
      speed: 0.8 + Math.random() * 0.4,
      size: 0.025 + Math.random() * 0.03,
      arcIndex: Math.floor(i / PARTICLES_PER_ARC),
    }))
  }, [totalParticles])

  useFrame((state) => {
    if (!meshRef.current || totalParticles === 0) return

    const time = state.clock.elapsedTime

    for (let i = 0; i < totalParticles; i++) {
      const { offset, speed, size, arcIndex } = offsets[i]

      if (arcIndex >= curves.length) {
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }

      const { curve, color } = curves[arcIndex]
      const t = ((time * speed * 0.12 + offset) % 1)
      const pos = curve.getPointAt(t)

      const wobble = Math.sin(time * 2 + i) * 0.05
      dummy.position.set(pos.x + wobble, pos.y + wobble * 0.5, pos.z)

      const pulse = 1 + Math.sin(time * 3 + i) * 0.3
      dummy.scale.set(size * pulse, size * pulse, size * pulse)
      dummy.updateMatrix()

      meshRef.current.setMatrixAt(i, dummy.matrix)
      meshRef.current.setColorAt(i, color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (totalParticles === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalParticles]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        emissive="#10b981"
        emissiveIntensity={2}
        toneMapped={false}
        transparent
        opacity={0.85}
      />
    </instancedMesh>
  )
}

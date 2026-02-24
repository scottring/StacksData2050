'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { latLngToSphere, type CompanyNode } from '@/lib/geo'

interface CompanyNodesProps {
  companies: CompanyNode[]
  selectedId: string | null
  onNodeClick: (id: string) => void
}

const ROLE_COLORS = {
  customer: new THREE.Color('#3b82f6'),  // blue
  supplier: new THREE.Color('#10b981'),  // emerald
  both: new THREE.Color('#8b5cf6'),      // violet
}

export default function CompanyNodes({ companies, selectedId, onNodeClick }: CompanyNodesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const hoveredRef = useRef<number | null>(null)

  // Precompute positions
  const nodeData = useMemo(() => {
    return companies.map((company) => ({
      company,
      position: latLngToSphere(company.latitude, company.longitude),
      color: ROLE_COLORS[company.role],
    }))
  }, [companies])

  useFrame((state) => {
    if (!meshRef.current || nodeData.length === 0) return

    const time = state.clock.elapsedTime

    for (let i = 0; i < nodeData.length; i++) {
      const { position, company } = nodeData[i]
      const isSelected = company.id === selectedId
      const isHovered = i === hoveredRef.current

      dummy.position.copy(position)

      // Pulse effect for nodes with pending actions
      const baseScale = 0.06
      const pulse = company.pendingActions > 0
        ? baseScale * (1 + Math.sin(time * 2 + i) * 0.3)
        : baseScale
      const scale = isSelected ? baseScale * 2 : isHovered ? baseScale * 1.5 : pulse

      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Color: selected nodes glow white, others use role color
      const color = isSelected
        ? new THREE.Color('#ffffff')
        : nodeData[i].color
      meshRef.current.setColorAt(i, color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (nodeData.length === 0) return null

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, nodeData.length]}
        onPointerOver={(e) => {
          e.stopPropagation()
          hoveredRef.current = e.instanceId ?? null
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hoveredRef.current = null
          document.body.style.cursor = 'default'
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (e.instanceId !== undefined && e.instanceId < nodeData.length) {
            onNodeClick(nodeData[e.instanceId].company.id)
          }
        }}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          emissive="#10b981"
          emissiveIntensity={2}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </instancedMesh>

      {/* Action badges for nodes with pending items */}
      {nodeData.map(({ company, position }) => {
        if (company.pendingActions === 0) return null
        return (
          <Html
            key={company.id}
            position={[position.x, position.y + 0.25, position.z]}
            center
            distanceFactor={12}
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-lg shadow-rose-500/30">
              {company.pendingActions}
            </div>
          </Html>
        )
      })}
    </>
  )
}

'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { latLngToSphere, arcBetween, STATUS_COLORS, type CompanyNode, type RequestArc } from '@/lib/geo'

interface RequestArcsProps {
  arcs: RequestArc[]
  companies: CompanyNode[]
  selectedArcId: string | null
}

interface ArcData {
  arc: RequestArc
  curve: THREE.CatmullRomCurve3
  geometry: THREE.TubeGeometry
  material: THREE.ShaderMaterial
}

export default function RequestArcs({ arcs, companies, selectedArcId }: RequestArcsProps) {
  const arcsRef = useRef<ArcData[]>([])

  // Build company lookup
  const companyMap = useMemo(() => {
    const map = new Map<string, CompanyNode>()
    companies.forEach((c) => map.set(c.id, c))
    return map
  }, [companies])

  // Build arc geometries + materials
  const arcDataList = useMemo(() => {
    return arcs.map((arc) => {
      const fromCompany = companyMap.get(arc.fromCompanyId)
      const toCompany = companyMap.get(arc.toCompanyId)

      if (!fromCompany || !toCompany) return null

      const from = latLngToSphere(fromCompany.latitude, fromCompany.longitude)
      const to = latLngToSphere(toCompany.latitude, toCompany.longitude)
      const curve = arcBetween(from, to)

      const geometry = new THREE.TubeGeometry(curve, 64, 0.04, 8, false)

      const statusColor = STATUS_COLORS[arc.status]

      const material = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uTime;
          varying vec3 vPosition;
          void main() {
            // Subtle pulse along the arc
            float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + length(vPosition) * 3.0);
            gl_FragColor = vec4(uColor * pulse, uOpacity);
          }
        `,
        uniforms: {
          uColor: { value: statusColor },
          uOpacity: { value: 0.6 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })

      return { arc, curve, geometry, material } as ArcData
    }).filter(Boolean) as ArcData[]
  }, [arcs, companyMap])

  arcsRef.current = arcDataList

  useFrame((state) => {
    const time = state.clock.elapsedTime

    for (const arcData of arcsRef.current) {
      const isSelected = arcData.arc.id === selectedArcId
      arcData.material.uniforms.uTime.value = time
      arcData.material.uniforms.uOpacity.value = selectedArcId
        ? isSelected ? 0.8 : 0.15
        : 0.6
    }
  })

  if (arcDataList.length === 0) return null

  return (
    <group>
      {arcDataList.map((arcData) => (
        <mesh
          key={arcData.arc.id}
          geometry={arcData.geometry}
          material={arcData.material}
        />
      ))}
    </group>
  )
}

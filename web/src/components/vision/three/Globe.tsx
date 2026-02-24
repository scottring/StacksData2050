'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface GlobeProps {
  visible: boolean
  progress: number
  opacity: number
}

export default function Globe({ visible, progress, opacity }: GlobeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const currentOpacity = useRef(0)
  const currentRotation = useRef(0)

  // Load the real NASA Blue Marble earth texture
  const earthTexture = useLoader(THREE.TextureLoader, '/vision/textures/earth-blue-marble.jpg')
  earthTexture.colorSpace = THREE.SRGBColorSpace

  // Atmosphere shader
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float uOpacity;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.06, 0.73, 0.51, intensity * uOpacity * 0.6);
        }
      `,
      uniforms: {
        uOpacity: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current || !atmosphereRef.current) return

    // Smooth opacity transition
    const targetOpacity = visible ? opacity : 0
    currentOpacity.current += (targetOpacity - currentOpacity.current) * delta * 3

    // Rotation: slow auto-rotate + scroll-linked boost
    const autoRotate = delta * 0.08
    const scrollRotate = progress * Math.PI * 0.8
    currentRotation.current += autoRotate
    meshRef.current.rotation.y = currentRotation.current + scrollRotate

    // Update material opacity
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.opacity = currentOpacity.current
    mat.transparent = true

    // Atmosphere
    atmosphereMaterial.uniforms.uOpacity.value = currentOpacity.current
    atmosphereRef.current.rotation.y = meshRef.current.rotation.y
  })

  return (
    <group>
      <mesh ref={meshRef} visible={visible} scale={3.5}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.1}
          transparent
          opacity={0}
        />
      </mesh>
      <mesh ref={atmosphereRef} visible={visible} scale={3.7}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  )
}

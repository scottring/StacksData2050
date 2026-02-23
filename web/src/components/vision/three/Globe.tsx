'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
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

  // Generate a procedural earth-like texture
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Ocean base
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, 512)
    oceanGradient.addColorStop(0, '#0c1445')
    oceanGradient.addColorStop(0.3, '#0a2a5e')
    oceanGradient.addColorStop(0.5, '#0d3b6e')
    oceanGradient.addColorStop(0.7, '#0a2a5e')
    oceanGradient.addColorStop(1, '#0c1445')
    ctx.fillStyle = oceanGradient
    ctx.fillRect(0, 0, 1024, 512)

    // Simplified continent shapes (stylized, not geographically accurate)
    ctx.fillStyle = '#1a5c3a'
    // Europe/Africa region
    ctx.beginPath()
    ctx.ellipse(520, 180, 60, 80, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(510, 300, 50, 100, -0.1, 0, Math.PI * 2)
    ctx.fill()
    // Americas
    ctx.beginPath()
    ctx.ellipse(250, 160, 70, 90, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(280, 320, 50, 80, -0.2, 0, Math.PI * 2)
    ctx.fill()
    // Asia
    ctx.beginPath()
    ctx.ellipse(700, 180, 120, 80, 0.1, 0, Math.PI * 2)
    ctx.fill()
    // Australia
    ctx.beginPath()
    ctx.ellipse(780, 350, 40, 30, 0.3, 0, Math.PI * 2)
    ctx.fill()

    // Add some variation with lighter greens
    ctx.fillStyle = '#2a7d4f'
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.ellipse(520, 170, 40, 50, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(700, 170, 80, 50, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(260, 150, 50, 60, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0

    // Grid lines for a "data" feel
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(1024, i)
      ctx.stroke()
    }
    for (let i = 0; i < 1024; i += 32) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 512)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])

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

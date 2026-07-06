import * as THREE from 'three'

const GLOBE_RADIUS = 3.5

/**
 * Convert latitude/longitude to 3D position on a sphere.
 * lat/lng in degrees. Returns Vector3 on globe surface.
 */
export function latLngToSphere(
  lat: number,
  lng: number,
  radius: number = GLOBE_RADIUS
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

/**
 * Generate CatmullRomCurve3 control points for a great-circle arc
 * between two globe surface positions. The arc rises above the surface
 * proportional to the distance between points.
 */
export function arcBetween(
  from: THREE.Vector3,
  to: THREE.Vector3,
  segments: number = 6
): THREE.CatmullRomCurve3 {
  const distance = from.distanceTo(to)
  const midPoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)

  // Arc height: proportional to distance, min 0.5, max 3.0
  const arcHeight = Math.min(3.0, Math.max(0.5, distance * 0.4))

  // Lift the midpoint away from globe center (outward)
  const liftDirection = midPoint.clone().normalize()
  const peakPoint = midPoint.clone().add(liftDirection.multiplyScalar(arcHeight))

  // Generate intermediate points along the arc
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments

    if (i === 0) {
      points.push(from.clone())
    } else if (i === segments) {
      points.push(to.clone())
    } else {
      // Quadratic bezier-like interpolation through the peak
      const a = from.clone().lerp(peakPoint, t)
      const b = peakPoint.clone().lerp(to, t)
      points.push(a.lerp(b, t))
    }
  }

  return new THREE.CatmullRomCurve3(points)
}

/**
 * Type definitions for globe data
 */
export interface CompanyNode {
  id: string
  name: string
  latitude: number
  longitude: number
  role: 'customer' | 'supplier' | 'both'
  pendingActions: number
}

export interface RequestArc {
  id: string
  fromCompanyId: string
  toCompanyId: string
  status: 'awaiting' | 'processing' | 'complete' | 'attention'
  productName: string
  frameworks: string[]
}

export const STATUS_COLORS = {
  awaiting: new THREE.Color('#f59e0b'),   // amber
  processing: new THREE.Color('#3b82f6'), // blue
  complete: new THREE.Color('#10b981'),   // emerald
  attention: new THREE.Color('#f43f5e'),  // rose
} as const

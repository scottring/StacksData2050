import type { Metadata } from 'next'
import VisionLoader from '@/components/vision/VisionLoader'

export const metadata: Metadata = {
  title: 'Stacks — The Vision',
  description: 'See how Stacks transforms supply chain compliance data from chaos to clarity.',
}

export default function VisionRoute() {
  return <VisionLoader />
}

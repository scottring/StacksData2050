import StationLayout from '@/components/station/StationLayout'

export default function StationRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StationLayout>{children}</StationLayout>
}

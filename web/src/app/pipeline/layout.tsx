import { AppLayout } from '@/components/layout/app-layout'

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Intelligence Pipeline">{children}</AppLayout>
}

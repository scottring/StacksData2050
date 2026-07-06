import CommandLayout from '@/components/command/CommandLayout'

export default function CommandRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CommandLayout>{children}</CommandLayout>
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  ShoppingCart,
  HelpCircle,
  Tags,
  BarChart3,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const customerNavItems: NavItem[] = [
  {
    title: 'Our Suppliers',
    href: '/suppliers',
    icon: Building2,
  },
  {
    title: 'Supplier Products',
    href: '/supplier-products',
    icon: Package,
  },
]

const supplierNavItems: NavItem[] = [
  {
    title: 'Our Customers',
    href: '/customers',
    icon: Users,
  },
  {
    title: 'Products Sold',
    href: '/customer-products',
    icon: ShoppingCart,
  },
]

const adminNavItems: NavItem[] = [
  {
    title: 'Questions',
    href: '/questions',
    icon: HelpCircle,
  },
  {
    title: 'Tags',
    href: '/tags',
    icon: Tags,
  },
]

interface NavSectionProps {
  title: string
  items: NavItem[]
  pathname: string
}

function NavSection({ title, items, pathname }: NavSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isOpen ? '' : '-rotate-90'
          )}
        />
      </button>
      {isOpen && (
        <nav className="mt-1 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-lg font-semibold">Stacks</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Dashboard */}
        <nav className="mb-4">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/dashboard'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>

        <NavSection title="As Customer" items={customerNavItems} pathname={pathname} />
        <NavSection title="As Supplier" items={supplierNavItems} pathname={pathname} />
        <NavSection title="Admin" items={adminNavItems} pathname={pathname} />

        {/* Reports */}
        <nav className="mt-4">
          <Link
            href="/reports"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/reports' || pathname.startsWith('/reports/')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
        </nav>
      </div>

      {/* Bottom section */}
      <div className="border-t p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  )
}

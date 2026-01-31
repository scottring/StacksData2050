'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  ShieldAlert,
  Inbox,
  Send,
  FileUp,
  LogOut,
  User,
  Shield,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  email: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  role: string | null
}

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
  {
    title: 'Outgoing Requests',
    href: '/requests/outgoing',
    icon: Send,
  },
  {
    title: 'Import Workbooks',
    href: '/import',
    icon: FileUp,
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
  {
    title: 'Incoming Requests',
    href: '/requests/incoming',
    icon: Inbox,
  },
]

const complianceNavItems: NavItem[] = [
  {
    title: 'Supplier View',
    href: '/compliance/supplier',
    icon: ShieldAlert,
  },
  {
    title: 'Manufacturer View',
    href: '/compliance/manufacturer',
    icon: Building2,
  },
]

const adminNavItems: NavItem[] = [
  {
    title: 'Companies',
    href: '/admin/companies',
    icon: Building2,
  },
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
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, email, company_id, role')
          .eq('id', authUser.id)
          .single()

        let companyName = null
        if (profile?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', profile.company_id)
            .single()
          companyName = company?.name || null
        }

        setUser({
          email: profile?.email || authUser.email || '',
          firstName: profile?.full_name?.split(" ")[0] || null,
          lastName: profile?.full_name?.split(" ").slice(1).join(" ") || null,
          companyName,
          role: profile?.role || null,
        })
      }
    }

    fetchUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return '??'
  }

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user?.firstName) {
      return user.firstName
    }
    return user?.email || 'User'
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center">
          <img
            src="/stacks-logo-new.png"
            alt="Stacks Data"
            className="h-10 w-auto"
          />
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
        <NavSection title="Compliance" items={complianceNavItems} pathname={pathname} />
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
      <div className="border-t p-3 space-y-2">
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

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left truncate">
                <p className="text-sm font-medium truncate">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="top">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                {user?.companyName && (
                  <p className="text-xs text-muted-foreground">{user.companyName}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Company Settings
              </Link>
            </DropdownMenuItem>
            {user?.role === 'super_admin' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

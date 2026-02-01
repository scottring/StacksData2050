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
  Inbox,
  Send,
  FileUp,
  LogOut,
  User,
  Shield,
  ChevronRight,
  Plug,
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
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
      >
        {title}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            isOpen ? '' : '-rotate-90'
          )}
        />
      </button>
      <div className={cn(
        "grid transition-all duration-200 ease-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <nav className="overflow-hidden mt-1 space-y-0.5">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform duration-150",
                  !isActive && "group-hover:scale-110"
                )} />
                <span>{item.title}</span>
                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
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

  const isDashboardActive = pathname === '/dashboard'
  const isReportsActive = pathname === '/reports' || pathname.startsWith('/reports/')
  const isIntegrationsActive = pathname === '/integrations' || pathname.startsWith('/integrations/')
  const isSettingsActive = pathname === '/settings'

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200/60 bg-gradient-to-b from-slate-50 to-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-200/60 px-5">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <img
            src="/stacks-logo-new.png"
            alt="Stacks Data"
            className="h-9 w-auto transition-transform duration-200 group-hover:scale-105"
          />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Dashboard */}
        <nav className="mb-4">
          <Link
            href="/dashboard"
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isDashboardActive
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <LayoutDashboard className={cn(
              "h-4 w-4 transition-transform duration-150",
              !isDashboardActive && "group-hover:scale-110"
            )} />
            <span>Dashboard</span>
            {isDashboardActive && (
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" />
            )}
          </Link>
        </nav>

        <NavSection title="As Customer" items={customerNavItems} pathname={pathname} />
        <NavSection title="As Supplier" items={supplierNavItems} pathname={pathname} />
        <NavSection title="Admin" items={adminNavItems} pathname={pathname} />

        {/* Reports & Integrations */}
        <nav className="mt-4 pt-4 border-t border-slate-200/60 space-y-0.5">
          <Link
            href="/reports"
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isReportsActive
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <BarChart3 className={cn(
              "h-4 w-4 transition-transform duration-150",
              !isReportsActive && "group-hover:scale-110"
            )} />
            <span>Reports</span>
            {isReportsActive && (
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" />
            )}
          </Link>
          <Link
            href="/integrations"
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isIntegrationsActive
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Plug className={cn(
              "h-4 w-4 transition-transform duration-150",
              !isIntegrationsActive && "group-hover:scale-110"
            )} />
            <span>Integrations</span>
            {isIntegrationsActive && (
              <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" />
            )}
          </Link>
        </nav>
      </div>

      {/* Bottom section */}
      <div className="border-t border-slate-200/60 p-3 space-y-2 bg-white/50">
        <Link
          href="/settings"
          className={cn(
            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
            isSettingsActive
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <Settings className={cn(
            "h-4 w-4 transition-transform duration-150",
            !isSettingsActive && "group-hover:scale-110"
          )} />
          <span>Settings</span>
          {isSettingsActive && (
            <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" />
          )}
        </Link>

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-slate-100 group">
              <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xs font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{getDisplayName()}</p>
                <p className="text-xs text-slate-500 truncate">{user?.companyName || user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl shadow-lg border-slate-200/60" align="start" side="top" sideOffset={8}>
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900">{getDisplayName()}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                {user?.companyName && (
                  <p className="text-xs text-slate-400">{user.companyName}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem asChild className="rounded-lg mx-1 cursor-pointer">
              <Link href="/profile" className="flex items-center gap-2 px-2 py-2">
                <User className="h-4 w-4 text-slate-500" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg mx-1 cursor-pointer">
              <Link href="/settings" className="flex items-center gap-2 px-2 py-2">
                <Settings className="h-4 w-4 text-slate-500" />
                <span>Company Settings</span>
              </Link>
            </DropdownMenuItem>
            {user?.role === 'super_admin' && (
              <>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem asChild className="rounded-lg mx-1 cursor-pointer">
                  <Link href="/admin" className="flex items-center gap-2 px-2 py-2">
                    <Shield className="h-4 w-4 text-violet-500" />
                    <span>Admin Panel</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg mx-1 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

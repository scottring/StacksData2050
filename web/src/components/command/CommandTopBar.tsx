'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, LogOut, Settings, User, Shield, Globe2 } from 'lucide-react'
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
import { NotificationBell } from '@/components/notifications/notification-bell'

interface UserProfile {
  email: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  role: string | null
}

export default function CommandTopBar() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [mounted, setMounted] = useState(false)
  const [q, setQ] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== '/') return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      e.preventDefault()
      searchInputRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
          firstName: profile?.full_name?.split(' ')[0] || null,
          lastName: profile?.full_name?.split(' ').slice(1).join(' ') || null,
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
    return user?.firstName || user?.email || 'User'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-5">
      <div className="flex h-14 w-full items-center justify-between rounded-b-2xl bg-zinc-900/80 backdrop-blur-xl border-b border-white/6 px-5">
        {/* Left: Logo */}
        <Link href="/command" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Globe2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-display text-lg font-semibold text-white tracking-tight">
            Stax<span className="text-emerald-400">Data</span>
          </span>
        </Link>

        {/* Center: Search */}
        <div className="hidden md:flex items-center max-w-md flex-1 mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/command?q=${encodeURIComponent(q)}`)
                }
              }}
              placeholder="Search suppliers, products, requests..."
              className="w-full rounded-xl bg-white/6 border border-white/8 py-2 pl-9 pr-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-mono bg-white/6 px-1.5 py-0.5 rounded">
              /
            </kbd>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <NotificationBell />

          {/* User menu */}
          {!mounted ? (
            <div
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5"
              aria-hidden="true"
            >
              <Avatar className="h-7 w-7 ring-1 ring-emerald-500/30">
                <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                  &nbsp;
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-white/6 transition-colors">
                <Avatar className="h-7 w-7 ring-1 ring-emerald-500/30">
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {user?.companyName && (
                  <span className="hidden lg:inline text-xs font-medium text-zinc-400">
                    {user.companyName}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-xl bg-zinc-900 border-white/8 shadow-2xl shadow-black/50"
              align="end"
              sideOffset={8}
            >
              <DropdownMenuLabel className="px-3 py-2">
                <p className="text-sm font-semibold text-white">{getDisplayName()}</p>
                <p className="text-xs text-zinc-500">{user?.email}</p>
                {user?.companyName && (
                  <p className="text-xs text-zinc-600 mt-0.5">{user.companyName}</p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/6" />
              <DropdownMenuItem asChild className="rounded-lg mx-1 cursor-pointer text-zinc-300 focus:bg-white/6 focus:text-white">
                <Link href="/profile" className="flex items-center gap-2 px-2 py-2">
                  <User className="h-4 w-4 text-zinc-500" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg mx-1 cursor-pointer text-zinc-300 focus:bg-white/6 focus:text-white">
                <Link href="/settings" className="flex items-center gap-2 px-2 py-2">
                  <Settings className="h-4 w-4 text-zinc-500" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg mx-1 cursor-pointer text-zinc-300 focus:bg-white/6 focus:text-white">
                <Link href="/dashboard" className="flex items-center gap-2 px-2 py-2">
                  <Globe2 className="h-4 w-4 text-zinc-500" />
                  <span>Classic View</span>
                </Link>
              </DropdownMenuItem>
              {user?.role === 'super_admin' && (
                <>
                  <DropdownMenuSeparator className="bg-white/6" />
                  <DropdownMenuItem asChild className="rounded-lg mx-1 cursor-pointer text-zinc-300 focus:bg-white/6 focus:text-white">
                    <Link href="/admin" className="flex items-center gap-2 px-2 py-2">
                      <Shield className="h-4 w-4 text-violet-400" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-white/6" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-lg mx-1 cursor-pointer text-rose-400 focus:text-rose-400 focus:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}

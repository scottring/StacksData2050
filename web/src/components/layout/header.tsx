'use client'

import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  title?: string
}

interface CompanyInfo {
  name: string | null
  logoUrl: string | null
}

export function Header({ title }: HeaderProps) {
  const [company, setCompany] = useState<CompanyInfo | null>(null)

  useEffect(() => {
    async function fetchCompany() {
      const supabase = createClient()

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', authUser.id)
          .single()

        if (profile?.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name, logo_url')
            .eq('id', profile.company_id)
            .single()

          setCompany({
            name: companyData?.name || null,
            logoUrl: companyData?.logo_url || null,
          })
        }
      }
    }

    fetchCompany()
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="font-display text-xl font-semibold text-slate-900 tracking-tight">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationBell />

        {/* Company logo */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200/60">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-slate-200/50">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name || 'Company'}
                className="h-9 w-9 object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-slate-400" />
            )}
          </div>
          {company?.name && (
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">{company.name}</span>
          )}
        </div>
      </div>
    </header>
  )
}

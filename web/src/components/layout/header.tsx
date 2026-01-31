'use client'

import { useEffect, useState } from 'react'
import { Search, Building2 } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Button } from '@/components/ui/button'
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
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* Company logo */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name || 'Company'}
                className="h-9 w-9 object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          {company?.name && (
            <span className="text-sm font-medium hidden sm:inline">{company.name}</span>
          )}
        </div>
      </div>
    </header>
  )
}

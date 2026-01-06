'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Search, LogIn, Shield, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  company_id: string | null
  company_name: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get current user's role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'super_admin') {
        setError('Access denied. Super admin privileges required.')
        setLoading(false)
        return
      }

      setCurrentUserRole(profile.role)

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, company_id')
        .order('email')

      if (usersError) {
        console.error('Error fetching users:', usersError)
        setError('Failed to load users')
        setLoading(false)
        return
      }

      // Fetch all companies for name lookup
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')

      const companyMap = new Map((companiesData || []).map(c => [c.id, c.name]))

      const formattedUsers = (usersData || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role || 'user',
        company_id: u.company_id,
        company_name: u.company_id ? companyMap.get(u.company_id) || null : null,
      }))

      setUsers(formattedUsers)
      setFilteredUsers(formattedUsers)
      setLoading(false)
    }

    fetchData()
  }, [router])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          (u) =>
            u.email.toLowerCase().includes(query) ||
            u.first_name?.toLowerCase().includes(query) ||
            u.last_name?.toLowerCase().includes(query) ||
            u.company_name?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, users])

  async function handleImpersonate(userId: string) {
    setImpersonating(userId)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('No active session')
        setImpersonating(null)
        return
      }

      // Call the impersonation edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/impersonate-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ targetUserId: userId }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Impersonation failed')
        setImpersonating(null)
        return
      }

      // Use the token_hash to verify and sign in
      if (data.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink',
        })

        if (verifyError) {
          setError(`Verification failed: ${verifyError.message}`)
          setImpersonating(null)
          return
        }

        // Redirect to dashboard as the impersonated user
        router.push('/dashboard')
        router.refresh()
      } else {
        setError('No token received from server')
        setImpersonating(null)
      }
    } catch (err) {
      console.error('Impersonation error:', err)
      setError('An unexpected error occurred')
      setImpersonating(null)
    }
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-100 text-purple-700">Super Admin</Badge>
      case 'admin':
        return <Badge className="bg-blue-100 text-blue-700">Admin</Badge>
      default:
        return <Badge variant="outline">User</Badge>
    }
  }

  if (loading) {
    return (
      <AppLayout title="Admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (error && currentUserRole !== 'super_admin') {
    return (
      <AppLayout title="Admin">
        <div className="flex items-center justify-center h-64">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <Shield className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Admin">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : 'Unnamed User'}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.company_name ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{user.company_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No company</span>
                          )}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImpersonate(user.id)}
                            disabled={impersonating !== null}
                          >
                            {impersonating === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <LogIn className="h-4 w-4 mr-2" />
                                Login as
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

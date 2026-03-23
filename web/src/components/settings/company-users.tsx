'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, UserPlus, Loader2, Check, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface CompanyUser {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  is_super_admin: boolean | null
  created_at: string | null
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-violet-50 text-violet-700 border-violet-200',
  editor: 'bg-sky-50 text-sky-700 border-sky-200',
  reviewer: 'bg-amber-50 text-amber-700 border-amber-200',
  viewer: 'bg-slate-50 text-slate-600 border-slate-200',
}

export function CompanyUsers() {
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'editor' })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const res = await fetch('/api/settings/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setCurrentUserRole(data.currentUserRole)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.firstName || !form.lastName) return

    setAdding(true)
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to add user')
        return
      }

      toast.success(`${form.firstName} added. A welcome email has been sent.`)
      setForm({ firstName: '', lastName: '', email: '', role: 'editor' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      toast.error('Failed to add user')
    } finally {
      setAdding(false)
    }
  }

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin'

  if (loading) {
    return (
      <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
      <CardHeader className="bg-gradient-to-br from-slate-50/50 to-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-100">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Team Members</CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? 's' : ''} in your company
              </CardDescription>
            </div>
          </div>
          {isAdmin && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Add user form */}
        {showForm && (
          <form onSubmit={handleAddUser} className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">First Name</label>
                <Input
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Last Name</label>
                <Input
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last name"
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="colleague@company.com"
                className="rounded-xl border-slate-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin -- full access, can manage users</SelectItem>
                  <SelectItem value="editor">Editor -- can edit sheets and answers</SelectItem>
                  <SelectItem value="reviewer">Reviewer -- can review and change status</SelectItem>
                  <SelectItem value="viewer">Viewer -- read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={adding} size="sm" className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500">
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                {adding ? 'Adding...' : 'Add & Send Welcome Email'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} className="rounded-xl">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* User list */}
        <div className="divide-y divide-slate-100">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between py-3 px-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {(user.full_name || user.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user.full_name || 'No name'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs border ${ROLE_COLORS[user.role || 'viewer'] || ROLE_COLORS.viewer}`}>
                {user.is_super_admin ? 'Super Admin' : ROLE_LABELS[user.role || 'viewer'] || user.role}
              </Badge>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No users found</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

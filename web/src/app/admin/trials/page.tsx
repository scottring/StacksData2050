'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { StatCard } from '@/components/ui/stat-card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Search,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  RefreshCw,
  Eye,
  Building2,
  Shield,
  Trash2,
  Activity,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { InviteTrialUsersDialog } from '@/components/admin/invite-trial-users-dialog'

interface TrialInvitation {
  id: string
  email: string
  company_name: string | null
  token: string
  sent_at: string | null
  accepted_at: string | null
  expires_at: string
  invitation_type: string
  trial_batch_id: string | null
  batch_name: string | null
  discovery_completed: boolean
  discovery_responded_at: string | null
  activity_count: number
}

interface DiscoveryResponse {
  id: string
  email: string
  company_name: string | null
  responded_at: string
  motivation_interest: string | null
  learning_goals: string | null
  success_definition: string | null
  impact_measurement: string | null
  concerns_questions: string | null
  trial_started_at: string | null
  platform_experience: string | null
  biggest_surprise: string | null
  remaining_questions: string | null
  likelihood_to_recommend: number | null
}

interface ActivityEvent {
  id: string
  event_type: string
  event_data: Record<string, unknown>
  page_path: string | null
  created_at: string
}

interface ActivitySummary {
  total_events: number
  logins: number
  sheets_viewed: number
  answers_submitted: number
  last_active: string | null
}

export default function TrialsPage() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<TrialInvitation[]>([])
  const [filteredInvitations, setFilteredInvitations] = useState<TrialInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<DiscoveryResponse | null>(null)
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [loadingResponse, setLoadingResponse] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<{ email: string; events: ActivityEvent[]; summary: ActivitySummary } | null>(null)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [sendingApology, setSendingApology] = useState(false)
  const [sendingTestApology, setSendingTestApology] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    discovery: 0,
    signedUp: 0,
    pending: 0,
  })

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

    // Fetch trial invitations
    const { data: invitationsData, error: invitationsError } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        company_name,
        token,
        sent_at,
        accepted_at,
        expires_at,
        invitation_type,
        trial_batch_id
      `)
      .eq('invitation_type', 'trial')
      .order('created_at', { ascending: false })

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      setError('Failed to load invitations')
      setLoading(false)
      return
    }

    // Fetch batch names
    const batchIds = [...new Set((invitationsData || []).map(i => i.trial_batch_id).filter(Boolean))]
    let batchMap = new Map<string, string>()
    if (batchIds.length > 0) {
      const { data: batchesData } = await supabase
        .from('trial_batches')
        .select('id, name')
        .in('id', batchIds)
      batchMap = new Map((batchesData || []).map(b => [b.id, b.name]))
    }

    // Fetch discovery responses for these emails
    const emails = (invitationsData || []).map(i => i.email.toLowerCase())
    const { data: discoveryData } = await supabase
      .from('trial_discovery_responses')
      .select('email, responded_at')
      .in('email', emails)
    const discoveryMap = new Map((discoveryData || []).map(d => [d.email, d.responded_at]))

    // Fetch activity counts for each email
    const activityCountMap = new Map<string, number>()
    if (emails.length > 0) {
      // Note: We need to count events per email. Supabase doesn't support group by in JS client easily,
      // so we'll fetch all events and count client-side (for small datasets this is fine)
      const { data: activityData } = await supabase
        .from('trial_activity_events')
        .select('email')
        .in('email', emails)

      if (activityData) {
        activityData.forEach(event => {
          const email = event.email.toLowerCase()
          activityCountMap.set(email, (activityCountMap.get(email) || 0) + 1)
        })
      }
    }

    // Format invitations
    const formattedInvitations: TrialInvitation[] = (invitationsData || []).map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      company_name: inv.company_name,
      token: inv.token,
      sent_at: inv.sent_at,
      accepted_at: inv.accepted_at,
      expires_at: inv.expires_at,
      invitation_type: inv.invitation_type,
      trial_batch_id: inv.trial_batch_id,
      batch_name: inv.trial_batch_id ? batchMap.get(inv.trial_batch_id) || null : null,
      discovery_completed: discoveryMap.has(inv.email.toLowerCase()),
      discovery_responded_at: discoveryMap.get(inv.email.toLowerCase()) || null,
      activity_count: activityCountMap.get(inv.email.toLowerCase()) || 0,
    }))

    setInvitations(formattedInvitations)
    setFilteredInvitations(formattedInvitations)

    // Calculate stats
    const now = new Date()
    const totalInvites = formattedInvitations.length
    const discoveryCount = formattedInvitations.filter(i => i.discovery_completed).length
    const signedUpCount = formattedInvitations.filter(i => i.accepted_at).length
    const pendingCount = formattedInvitations.filter(i =>
      !i.accepted_at && new Date(i.expires_at) > now
    ).length

    setStats({
      total: totalInvites,
      discovery: discoveryCount,
      signedUp: signedUpCount,
      pending: pendingCount,
    })

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [router])

  useEffect(() => {
    let filtered = invitations

    // Apply status filter
    if (statusFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(inv => {
        switch (statusFilter) {
          case 'pending':
            return !inv.accepted_at && new Date(inv.expires_at) > now
          case 'discovery':
            return inv.discovery_completed && !inv.accepted_at
          case 'accepted':
            return !!inv.accepted_at
          case 'expired':
            return !inv.accepted_at && new Date(inv.expires_at) <= now
          default:
            return true
        }
      })
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(inv =>
        inv.email.toLowerCase().includes(query) ||
        inv.company_name?.toLowerCase().includes(query) ||
        inv.batch_name?.toLowerCase().includes(query)
      )
    }

    setFilteredInvitations(filtered)
  }, [searchQuery, statusFilter, invitations])

  async function viewDiscoveryResponse(email: string) {
    setLoadingResponse(true)
    setResponseDialogOpen(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('trial_discovery_responses')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error) {
      console.error('Error fetching discovery response:', error)
      setSelectedResponse(null)
    } else {
      setSelectedResponse(data)
    }
    setLoadingResponse(false)
  }

  async function resendInvitation(invitationId: string, email: string) {
    setResendingId(invitationId)

    try {
      const response = await fetch('/api/admin/trials/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend')
      }

      // Show success message
      if (data.extended) {
        alert(`Invitation resent to ${email}. Expiration extended by 5 days.`)
      } else {
        alert(`Invitation resent to ${email}.`)
      }

      // Refresh the list
      await fetchData()
    } catch (error: any) {
      console.error('Error resending invitation:', error)
      alert(error.message || 'Failed to resend invitation')
    } finally {
      setResendingId(null)
    }
  }

  async function sendTestApologyEmail() {
    const testEmail = prompt('Enter email address to send test apology email to:')
    if (!testEmail) return

    setSendingTestApology(true)

    try {
      const response = await fetch('/api/admin/trials/send-apology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }

      alert(`Test apology email sent to ${testEmail}`)
    } catch (error: any) {
      console.error('Error sending test apology email:', error)
      alert(error.message || 'Failed to send test email')
    } finally {
      setSendingTestApology(false)
    }
  }

  async function sendApologyEmails() {
    if (!confirm('This will send an apology email to ALL trial users (including those who already signed up). Continue?')) {
      return
    }

    setSendingApology(true)

    try {
      const response = await fetch('/api/admin/trials/send-apology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      alert(`Successfully sent ${data.sent} apology emails to trial users.${data.errors ? `\n\nErrors:\n${data.errors.join('\n')}` : ''}`)

      // Refresh the list (expiration dates were extended)
      await fetchData()
    } catch (error: any) {
      console.error('Error sending apology emails:', error)
      alert(error.message || 'Failed to send apology emails')
    } finally {
      setSendingApology(false)
    }
  }

  async function viewActivity(email: string) {
    setLoadingActivity(true)
    setActivityDialogOpen(true)

    try {
      const response = await fetch(`/api/trial/activity?email=${encodeURIComponent(email)}`)
      const data = await response.json()

      if (data.events) {
        // Calculate summary
        const events = data.events as ActivityEvent[]
        const summary: ActivitySummary = {
          total_events: events.length,
          logins: events.filter(e => e.event_type === 'login').length,
          sheets_viewed: events.filter(e => e.event_type === 'sheet_viewed').length,
          answers_submitted: events.filter(e => e.event_type === 'answer_submitted').reduce((acc, e) => {
            return acc + ((e.event_data?.answer_count as number) || 1)
          }, 0),
          last_active: events.length > 0 ? events[0].created_at : null,
        }

        setSelectedActivity({ email, events, summary })
      } else {
        setSelectedActivity({ email, events: [], summary: { total_events: 0, logins: 0, sheets_viewed: 0, answers_submitted: 0, last_active: null } })
      }
    } catch (error) {
      console.error('Error fetching activity:', error)
      setSelectedActivity(null)
    }

    setLoadingActivity(false)
  }

  async function deleteInvitation(invitationId: string) {
    if (!confirm('Are you sure you want to delete this invitation?')) {
      return
    }

    setDeletingId(invitationId)

    try {
      const response = await fetch(`/api/admin/trials/invitation/${invitationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete')
      }

      // Refresh the list
      await fetchData()
    } catch (error: any) {
      console.error('Error deleting invitation:', error)
      alert(error.message || 'Failed to delete invitation')
    } finally {
      setDeletingId(null)
    }
  }

  function getStatusBadge(invitation: TrialInvitation) {
    const now = new Date()
    const isExpired = new Date(invitation.expires_at) <= now

    if (invitation.accepted_at) {
      return <Badge className="bg-emerald-100 text-emerald-700">Signed Up</Badge>
    }
    if (isExpired) {
      return <Badge className="bg-gray-100 text-gray-600">Expired</Badge>
    }
    if (invitation.discovery_completed) {
      return <Badge className="bg-sky-100 text-sky-700">Discovery Done</Badge>
    }
    if (invitation.sent_at) {
      return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
    }
    return <Badge variant="outline">Not Sent</Badge>
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <AppLayout title="Trial Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (error && currentUserRole !== 'super_admin') {
    return (
      <AppLayout title="Trial Management">
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
    <AppLayout title="Trial Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Invited"
            value={stats.total}
            icon={Users}
            accentColor="slate"
            delay={0}
          />
          <StatCard
            title="Discovery Completed"
            value={stats.discovery}
            icon={CheckCircle2}
            accentColor="sky"
            delay={100}
          />
          <StatCard
            title="Signed Up"
            value={stats.signedUp}
            icon={Mail}
            accentColor="emerald"
            delay={200}
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            accentColor="amber"
            delay={300}
          />
        </div>

        {/* Invitations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Trial Invitations
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendTestApologyEmail}
                  disabled={sendingTestApology}
                  title="Send test apology email"
                >
                  {sendingTestApology ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={sendApologyEmails}
                  disabled={sendingApology}
                >
                  {sendingApology ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Apology Email
                    </>
                  )}
                </Button>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Users
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, company, or batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="discovery">Discovery Done</SelectItem>
                  <SelectItem value="accepted">Signed Up</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Discovery</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {invitations.length === 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 opacity-40" />
                            <p>No trial invitations yet</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInviteDialogOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Invite your first users
                            </Button>
                          </div>
                        ) : (
                          'No invitations match your filters'
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <p className="font-medium">{invitation.email}</p>
                        </TableCell>
                        <TableCell>
                          {invitation.company_name ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{invitation.company_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invitation.batch_name ? (
                            <Badge variant="outline" className="font-normal">
                              {invitation.batch_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invitation.discovery_completed ? (
                            <span className="text-sm text-emerald-600">
                              {formatDate(invitation.discovery_responded_at)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invitation.activity_count > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto py-1 px-2 text-sm"
                              onClick={() => viewActivity(invitation.email)}
                            >
                              <Activity className="h-3 w-3 mr-1 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">{invitation.activity_count}</span>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(invitation.sent_at)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(invitation)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {invitation.discovery_completed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewDiscoveryResponse(invitation.email)}
                                title="View discovery response"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {!invitation.accepted_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInvitation(invitation.id, invitation.email)}
                                disabled={resendingId === invitation.id}
                                title={new Date(invitation.expires_at) <= new Date() ? "Resend & extend expiration" : "Resend invitation"}
                              >
                                {resendingId === invitation.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteInvitation(invitation.id)}
                              disabled={deletingId === invitation.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete invitation"
                            >
                              {deletingId === invitation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Showing {filteredInvitations.length} of {invitations.length} invitations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <InviteTrialUsersDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchData}
      />

      {/* Discovery Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Discovery Response</DialogTitle>
            <DialogDescription>
              {selectedResponse?.email} • {selectedResponse?.company_name || 'No company'}
            </DialogDescription>
          </DialogHeader>
          {loadingResponse ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedResponse ? (
            <div className="space-y-6">
              {/* Initial Discovery Questions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Initial Discovery
                </h3>
                <div className="space-y-4">
                  <QuestionResponse
                    question="What makes you interested in trying this trial?"
                    answer={selectedResponse.motivation_interest}
                  />
                  <QuestionResponse
                    question="What do you hope to learn from your participation?"
                    answer={selectedResponse.learning_goals}
                  />
                  <QuestionResponse
                    question="What would be a successful outcome for your organization?"
                    answer={selectedResponse.success_definition}
                  />
                  <QuestionResponse
                    question="How would you know if this platform could impact your work?"
                    answer={selectedResponse.impact_measurement}
                  />
                  <QuestionResponse
                    question="What questions or concerns do you have going in?"
                    answer={selectedResponse.concerns_questions}
                  />
                </div>
              </div>

              {/* Follow-up Questions (if answered) */}
              {(selectedResponse.platform_experience || selectedResponse.likelihood_to_recommend) && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Follow-up Responses
                  </h3>
                  <div className="space-y-4">
                    <QuestionResponse
                      question="How has your experience with the platform been so far?"
                      answer={selectedResponse.platform_experience}
                    />
                    <QuestionResponse
                      question="What's been the biggest surprise?"
                      answer={selectedResponse.biggest_surprise}
                    />
                    <QuestionResponse
                      question="What questions do you still have?"
                      answer={selectedResponse.remaining_questions}
                    />
                    {selectedResponse.likelihood_to_recommend && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Likelihood to recommend (1-10)
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-semibold">
                            {selectedResponse.likelihood_to_recommend}
                          </span>
                          <span className="text-muted-foreground">/10</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground py-4">No response found</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </DialogTitle>
            <DialogDescription>
              {selectedActivity?.email}
            </DialogDescription>
          </DialogHeader>
          {loadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedActivity ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold">{selectedActivity.summary.logins}</p>
                  <p className="text-xs text-muted-foreground">Logins</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold">{selectedActivity.summary.sheets_viewed}</p>
                  <p className="text-xs text-muted-foreground">Sheets Viewed</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold">{selectedActivity.summary.answers_submitted}</p>
                  <p className="text-xs text-muted-foreground">Answers</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold">{selectedActivity.summary.total_events}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
              </div>

              {/* Last Active */}
              {selectedActivity.summary.last_active && (
                <p className="text-sm text-muted-foreground">
                  Last active: {new Date(selectedActivity.summary.last_active).toLocaleString()}
                </p>
              )}

              {/* Event Timeline */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Recent Activity
                </h3>
                {selectedActivity.events.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">No activity recorded yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedActivity.events.slice(0, 50).map((event) => (
                      <div key={event.id} className="flex items-start gap-3 text-sm py-2 border-b last:border-0">
                        <div className="flex-shrink-0 w-24 text-muted-foreground text-xs">
                          {new Date(event.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          {new Date(event.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{formatEventType(event.event_type)}</span>
                          {event.event_data && Object.keys(event.event_data).length > 0 && (
                            <span className="text-muted-foreground ml-2">
                              {formatEventData(event.event_type, event.event_data)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-4">No activity data found</p>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

function QuestionResponse({ question, answer }: { question: string; answer: string | null }) {
  if (!answer) return null
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{question}</p>
      <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{answer}</p>
    </div>
  )
}

function formatEventType(eventType: string): string {
  const labels: Record<string, string> = {
    login: 'Logged in',
    page_view: 'Viewed page',
    sheet_viewed: 'Viewed sheet',
    sheet_created: 'Created sheet',
    answer_submitted: 'Submitted answers',
    answer_updated: 'Updated answers',
    file_uploaded: 'Uploaded file',
    export_downloaded: 'Downloaded export',
    discovery_started: 'Started discovery',
    discovery_completed: 'Completed discovery',
    follow_up_completed: 'Completed follow-up',
  }
  return labels[eventType] || eventType
}

function formatEventData(eventType: string, data: Record<string, unknown>): string {
  if (eventType === 'sheet_viewed' && data.sheet_name) {
    return `"${data.sheet_name}"`
  }
  if (eventType === 'answer_submitted' && data.answer_count) {
    return `(${data.answer_count} answers)`
  }
  if (eventType === 'page_view' && data.page_name) {
    return data.page_name as string
  }
  return ''
}

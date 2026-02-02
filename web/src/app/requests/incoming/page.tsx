'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
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
import { Search, Loader2, FileText, ChevronRight, Inbox, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface IncomingRequest {
  id: string
  processed: boolean
  created_at: string
  sheet_id: string | null
  sheet: {
    id: string
    name: string
    status: string | null
  } | null
  owner_company: {
    id: string
    name: string
  } | null
  request_tags: Array<{
    tag: {
      name: string
    }
  }>
}

export default function IncomingRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<IncomingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      setLoading(false)
      return
    }

    setCompanyId(userData.company_id)

    const { data: requestData, error } = await supabase
      .from('requests')
      .select(`
        id,
        processed,
        created_at,
        sheet_id,
        sheet:sheets(id, name, status),
        owner_company:companies!requestor_id(id, name)

      `)
      .eq('requesting_from_id', userData.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching incoming requests:', error)
    }

    const requestIds = requestData?.map((r: any) => r.id) || []
    const tagsByRequest: Record<string, string[]> = {}
    if (requestIds.length > 0) {
      const { data: rtData } = await supabase.from("request_tags").select("request_id, tag_id").in("request_id", requestIds)
      const tagIds = [...new Set(rtData?.map((rt: any) => rt.tag_id) || [])]

      if (tagIds.length > 0) {
        const { data: tagsData } = await supabase.from("tags").select("id, name").in("id", tagIds)
        const tagNameMap = new Map(tagsData?.map((t: any) => [t.id, t.name]) || [])

        rtData?.forEach((rt: any) => {
          if (!tagsByRequest[rt.request_id]) tagsByRequest[rt.request_id] = []
          const name = tagNameMap.get(rt.tag_id)
          if (name) tagsByRequest[rt.request_id].push(name)
        })
      }
    }
    const requestsWithTags = requestData?.map((r: any) => ({ ...r, request_tags: (tagsByRequest[r.id] || []).map(name => ({ tag: { name } })) }))
    setRequests((requestsWithTags as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    const supabase = createClient()

    const sheetIds = requests.map(r => r.sheet?.id).filter(Boolean) as string[]
    if (sheetIds.length === 0) return

    const channel = supabase
      .channel('incoming-requests-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sheets' },
        (payload) => {
          if (sheetIds.includes(payload.new.id)) {
            setRequests(prev => prev.map(r => {
              if (r.sheet?.id === payload.new.id) {
                return { ...r, sheet: { ...r.sheet!, status: payload.new.status } }
              }
              return r
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        () => fetchRequests()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requests, fetchRequests])

  const filteredRequests = requests.filter(r =>
    r.sheet?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner_company?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = requests.filter(r => !r.processed).length
  const processedCount = requests.filter(r => r.processed).length
  const sheetStatusCount = requests.filter(r => r.sheet?.status === 'responded' || r.sheet?.status === 'approved').length

  const getStatusConfig = (status: string | null | undefined) => {
    if (status === 'submitted') {
      return { label: 'Submitted', className: 'bg-sky-50 text-sky-700 border-sky-200/50' }
    }
    if (status === 'approved') {
      return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/50' }
    }
    if (status === 'in_progress') {
      return { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200/50' }
    }
    if (status === 'flagged') {
      return { label: 'Needs Revision', className: 'bg-rose-50 text-rose-700 border-rose-200/50' }
    }
    return { label: 'Pending', className: 'bg-slate-50 text-slate-600 border-slate-200/50' }
  }

  if (loading) {
    return (
      <AppLayout title="Incoming Requests">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-sky-100 animate-pulse" />
              <Loader2 className="h-6 w-6 animate-spin absolute inset-0 m-auto text-violet-600" />
            </div>
            <span className="text-sm font-medium">Loading requests...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Incoming Requests">
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Incoming Requests"
          description="Product data requests from your customers"
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Total Requests" value={requests.length} icon={FileText} accentColor="slate" delay={100} />
          <StatCard title="Pending" value={pendingCount} icon={Clock} accentColor="amber" delay={150} />
          <StatCard title="Processed" value={processedCount} icon={Inbox} accentColor="sky" delay={200} />
          <StatCard title="Completed" value={sheetStatusCount} icon={CheckCircle2} accentColor="emerald" delay={250} />
        </div>

        {/* Search */}
        <div className="relative max-w-sm opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl border-slate-200 focus:border-violet-300 focus:ring-violet-200"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <TableHead className="font-semibold text-slate-700">Product</TableHead>
                <TableHead className="font-semibold text-slate-700">From Company</TableHead>
                <TableHead className="font-semibold text-slate-700">Tags</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Created</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Inbox className="h-8 w-8 text-slate-400" />
                      </div>
                      <span className="font-medium">
                        {searchQuery ? 'No requests found matching your search' : 'No incoming requests yet'}
                      </span>
                      {!searchQuery && (
                        <p className="text-sm text-slate-400">Requests from customers will appear here</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => {
                  const statusConfig = getStatusConfig(request.sheet?.status)
                  return (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-slate-50/50 transition-colors group"
                      onClick={() => router.push(`/sheets/${request.sheet?.id}/edit`)}
                    >
                      <TableCell className="font-medium text-slate-900">{request.sheet?.name || 'Untitled'}</TableCell>
                      <TableCell className="text-slate-600">{request.owner_company?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 flex-wrap">
                          {request.request_tags?.map((rt, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs rounded-full border-slate-200 text-slate-600">
                              {rt.tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border font-medium", statusConfig.className)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="rounded-lg text-slate-600 hover:text-slate-900">
                          View
                          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}

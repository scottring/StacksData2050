'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
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
import { RequestStatusBadge } from '@/components/requests/request-status-badge'
import { Search, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface IncomingRequest {
  id: string
  processed: boolean
  created_at: string
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

  useEffect(() => {
    async function fetchRequests() {
      const supabase = createClient()

      // Get current user's company
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

      // Fetch requests where we are the supplier (requesting_from_id)
      const { data: requestData, error } = await supabase
        .from('requests')
        .select(`
          id,
          processed,
          created_at,
          sheet:sheets(id, name, status),
          owner_company:companies!requestor_id(id, name)
          
        `)
        .eq('requesting_from_id', userData.company_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching incoming requests:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
      }

      const requestIds = requestData?.map((r: any) => r.id) || []
      let tagsByRequest: Record<string, string[]> = {}
      if (requestIds.length > 0) {
        // Step 1: Get request_tags (FK to tags not in schema cache, so we fetch separately)
        const { data: rtData } = await supabase.from("request_tags").select("request_id, tag_id").in("request_id", requestIds)
        const tagIds = [...new Set(rtData?.map((rt: any) => rt.tag_id) || [])]
        
        // Step 2: Get tag names
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
    }

    fetchRequests()
  }, [])

  const filteredRequests = requests.filter(r =>
    r.sheet?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.owner_company?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = requests.filter(r => !r.processed).length
  const processedCount = requests.filter(r => r.processed).length
  const sheetStatusCount = requests.filter(r => r.sheet?.status === 'responded' || r.sheet?.status === 'approved').length

  if (loading) {
    return (
      <AppLayout title="Incoming Requests">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Loading requests...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Incoming Requests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Incoming Requests</h1>
            <p className="text-muted-foreground mt-1">
              Product data requests from your customers
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Total Requests</div>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{requests.length}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Pending</div>
              <Badge variant="outline">{pendingCount}</Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">{pendingCount}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Processed</div>
              <Badge variant="outline">{processedCount}</Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">{processedCount}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Completed</div>
              <Badge variant="outline">{sheetStatusCount}</Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">{sheetStatusCount}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>From Company</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {searchQuery ? 'No requests found matching your search' : 'No incoming requests yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/sheets/${request.sheet?.id}/edit`)}
                  >
                    <TableCell className="font-medium">{request.sheet?.name || 'Untitled'}</TableCell>
                    <TableCell>{request.owner_company?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {request.request_tags?.map((rt, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {rt.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.sheet?.status === "submitted" ? (
                        <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>
                      ) : request.sheet?.status === "approved" ? (
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                      ) : request.sheet?.status === "in_progress" ? (
                        <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                      ) : request.sheet?.status === "flagged" ? (
                        <Badge className="bg-red-100 text-red-800">Needs Revision</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}

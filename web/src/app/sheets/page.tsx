'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  FileText,
  Filter,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Sheet {
  id: string
  name: string
  status: string | null
  company_id: string | null
  requesting_company_id: string | null
  modified_at: string | null
  created_at: string | null
  company_name?: string
  requesting_company_name?: string
  answer_count?: number
  requestor_id?: string | null
  requestor_name?: string
}

interface Company {
  id: string
  name: string
}

interface Requestor {
  id: string
  name: string
}

// Sheets migrated from the previous platform have no request record, so no
// person raised them in this system. They are grouped under this sentinel
// rather than shown with a misleading name.
const LEGACY_REQUESTOR = '__legacy__'

export default function SheetsPage() {
  return (
    <Suspense fallback={
      <AppLayout title="Sheets">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    }>
      <SheetsContent />
    </Suspense>
  )
}

function SheetsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [requestors, setRequestors] = useState<Requestor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'all')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [filterRequestor, setFilterRequestor] = useState<string>('all')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get current user and check permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Check if user is super admin
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')

      // Get user's company_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const userCompanyId = userProfile?.company_id

      // Build query - super admins see all, others see only their company's sheets
      let query = supabase
        .from('sheets')
        .select(`
          id,
          name,
          status,
          company_id,
          requesting_company_id,
          modified_at,
          created_at
        `)
        .order('name', { ascending: true })

      // If not super admin, filter to user's company sheets only
      if (!isSuperAdmin && userCompanyId) {
        query = query.or(`company_id.eq.${userCompanyId},requesting_company_id.eq.${userCompanyId}`)
      }

      const { data: sheetsData, error } = await query

      if (error) {
        console.error('Error fetching sheets:', error)
        setLoading(false)
        return
      }

      // Fetch companies for names
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')

      const companyMap = new Map(companiesData?.map(c => [c.id, c.name]) || [])

      // Fetch answer counts
      const sheetIds = sheetsData?.map(s => s.id) || []
      const { data: answerCounts } = await supabase
        .from('answers')
        .select('sheet_id')
        .in('sheet_id', sheetIds)

      const countMap = new Map<string, number>()
      answerCounts?.forEach(a => {
        countMap.set(a.sheet_id, (countMap.get(a.sheet_id) || 0) + 1)
      })

      // Who raised each sheet. The person lives on requests.created_by --
      // requests.requestor_id is the requesting *company*, not a user. Sheets
      // imported from the previous platform have no request row at all.
      const { data: requestRows } = await supabase
        .from('requests')
        .select('sheet_id, created_by')
        .in('sheet_id', sheetIds)

      const requestorIdBySheet = new Map<string, string>()
      requestRows?.forEach(r => {
        if (r.sheet_id && r.created_by) requestorIdBySheet.set(r.sheet_id, r.created_by)
      })

      const requestorIds = [...new Set(requestorIdBySheet.values())]
      const { data: requestorUsers } = requestorIds.length
        ? await supabase.from('users').select('id, full_name, email').in('id', requestorIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[] }

      const requestorNameById = new Map(
        (requestorUsers || []).map(u => [u.id, u.full_name || u.email || 'Unknown'])
      )

      const enrichedSheets = (sheetsData || []).map(sheet => {
        const requestorId = requestorIdBySheet.get(sheet.id) || null
        return {
          ...sheet,
          company_name: sheet.company_id ? companyMap.get(sheet.company_id) : undefined,
          requesting_company_name: sheet.requesting_company_id ? companyMap.get(sheet.requesting_company_id) : undefined,
          answer_count: countMap.get(sheet.id) || 0,
          requestor_id: requestorId,
          requestor_name: requestorId ? requestorNameById.get(requestorId) : undefined,
        }
      })

      // Only offer requestors that actually appear in the visible sheets.
      const presentRequestors = [...new Set(
        enrichedSheets.map(s => s.requestor_id).filter((id): id is string => Boolean(id))
      )].map(id => ({ id, name: requestorNameById.get(id) || 'Unknown' }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setSheets(enrichedSheets)
      setCompanies(companiesData || [])
      setRequestors(presentRequestors)
      setLoading(false)
    }

    fetchData()
  }, [])

  // Get unique statuses
  const statuses = [...new Set(sheets.map(s => s.status).filter(Boolean))]

  // Filter sheets
  const filteredSheets = sheets.filter(sheet => {
    const matchesSearch = searchQuery === '' ||
      sheet.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.company_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filterStatus === 'all' ||
      sheet.status === filterStatus

    const matchesCompany = filterCompany === 'all' ||
      sheet.company_id === filterCompany ||
      sheet.requesting_company_id === filterCompany

    const matchesRequestor = filterRequestor === 'all' ||
      (filterRequestor === LEGACY_REQUESTOR
        ? !sheet.requestor_id
        : sheet.requestor_id === filterRequestor)

    return matchesSearch && matchesStatus && matchesCompany && matchesRequestor
  })

  const hasLegacySheets = sheets.some(s => !s.requestor_id)

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {status === 'approved' ? 'Approved' : 'Completed'}
          </Badge>
        )
      case 'submitted':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Send className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'flagged':
      case 'revision':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Revision
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'imported':
        return (
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            <FileText className="h-3 w-3 mr-1" />
            Imported
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status || 'Draft'}
          </Badge>
        )
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <AppLayout title="Sheets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Sheets</h1>
            <p className="text-muted-foreground mt-1">
              View and manage questionnaire sheets
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status} value={status!}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRequestor} onValueChange={setFilterRequestor}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Requestor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requestors</SelectItem>
              {requestors.map(requestor => (
                <SelectItem key={requestor.id} value={requestor.id}>
                  {requestor.name}
                </SelectItem>
              ))}
              {hasLegacySheets && (
                <SelectItem value={LEGACY_REQUESTOR}>Legacy import</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="text-sm">
            {filteredSheets.length} sheets
          </Badge>
        </div>

        {/* Sheets table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Sheet Name</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[180px]">Company</TableHead>
                <TableHead className="w-[180px]">Assigned To</TableHead>
                <TableHead className="w-[160px]">Requestor</TableHead>
                <TableHead className="w-[100px]">Answers</TableHead>
                <TableHead className="w-[120px]">Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>Loading sheets...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-12 w-12 opacity-30" />
                      <span>No sheets found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSheets.map((sheet) => (
                  <TableRow
                    key={sheet.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/sheets/${sheet.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{sheet.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(sheet.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sheet.company_name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sheet.requesting_company_name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sheet.requestor_name || (
                        <span className="italic opacity-60">Legacy import</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sheet.answer_count}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sheet.modified_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/sheets/${sheet.id}/edit`)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
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

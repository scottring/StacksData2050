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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Sheet {
  id: string
  name: string
  new_status: string | null
  company_id: string | null
  assigned_to_company_id: string | null
  modified_at: string | null
  created_at: string | null
  company_name?: string
  assigned_company_name?: string
  answer_count?: number
}

interface Company {
  id: string
  name: string
}

export default function SheetsPage() {
  const router = useRouter()
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCompany, setFilterCompany] = useState<string>('all')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch all sheets (super_admin sees all via RLS)
      const { data: sheetsData, error } = await supabase
        .from('sheets')
        .select(`
          id,
          name,
          new_status,
          company_id,
          assigned_to_company_id,
          modified_at,
          created_at
        `)
        .order('name', { ascending: true })

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

      const enrichedSheets = (sheetsData || []).map(sheet => ({
        ...sheet,
        company_name: sheet.company_id ? companyMap.get(sheet.company_id) : undefined,
        assigned_company_name: sheet.assigned_to_company_id ? companyMap.get(sheet.assigned_to_company_id) : undefined,
        answer_count: countMap.get(sheet.id) || 0
      }))

      setSheets(enrichedSheets)
      setCompanies(companiesData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  // Get unique statuses
  const statuses = [...new Set(sheets.map(s => s.new_status).filter(Boolean))]

  // Filter sheets
  const filteredSheets = sheets.filter(sheet => {
    const matchesSearch = searchQuery === '' ||
      sheet.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.company_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filterStatus === 'all' ||
      sheet.new_status === filterStatus

    const matchesCompany = filterCompany === 'all' ||
      sheet.company_id === filterCompany ||
      sheet.assigned_to_company_id === filterCompany

    return matchesSearch && matchesStatus && matchesCompany
  })

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
                <TableHead className="w-[100px]">Answers</TableHead>
                <TableHead className="w-[120px]">Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>Loading sheets...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
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
                      {getStatusBadge(sheet.new_status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sheet.company_name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sheet.assigned_company_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sheet.answer_count}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sheet.modified_at)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
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

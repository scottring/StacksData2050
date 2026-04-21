import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import Link from 'next/link'
import { ContactsCard } from '@/components/contacts/contacts-card'

type Company = Database['public']['Tables']['companies']['Row']
type Sheet = Database['public']['Tables']['sheets']['Row']

interface CustomerDetails {
  company: Company
  sheets: Sheet[]
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'approved':
    case 'imported':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      )
    case 'pending':
    case 'flagged':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status === 'flagged' ? 'Flagged' : 'Pending'}
        </Badge>
      )
    case 'draft':
      return <Badge variant="outline">Draft</Badge>
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>
  }
}

async function getCustomerDetails(customerId: string): Promise<CustomerDetails | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!userData?.company_id) return null

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', customerId)
    .single()
  if (!company) return null

  const { data: sheets } = await supabase
    .from('sheets')
    .select('*')
    .eq('company_id', userData.company_id)
    .eq('requesting_company_id', customerId)
    .order('modified_at', { ascending: false })

  return { company, sheets: sheets || [] }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: customerId } = await params
  const details = await getCustomerDetails(customerId)

  if (!details) {
    return (
      <AppLayout title="Customer Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Building2 className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Customer not found</p>
          <Link href="/customers">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const { company, sheets } = details
  const completedSheets = sheets.filter(
    (s) => s.status === 'approved' || s.status === 'imported'
  ).length
  const inProgressSheets = sheets.filter((s) => s.status === 'in_progress').length
  const pendingSheets = sheets.filter(
    (s) => s.status === 'pending' || s.status === 'flagged'
  ).length

  return (
    <AppLayout title={company.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{company.name}</h1>
                {company.location_text && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {company.location_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sheets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedSheets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{inProgressSheets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingSheets}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Sheets</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="h-12 w-12 opacity-30" />
                            <span>No product sheets yet</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sheets.map((sheet) => (
                        <TableRow key={sheet.id} className="group">
                          <TableCell>
                            <Link
                              href={`/sheets/${sheet.id}`}
                              className="flex items-center gap-3 group-hover:text-primary"
                            >
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">{sheet.name}</span>
                            </Link>
                          </TableCell>
                          <TableCell>{getStatusBadge(sheet.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {sheet.modified_at
                              ? new Date(sheet.modified_at).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Link href={`/sheets/${sheet.id}`}>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <ContactsCard companyId={company.id} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

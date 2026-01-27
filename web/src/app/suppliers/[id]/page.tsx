'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Mail,
  Phone,
  MapPin,
  Plus,
  FileText,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Company, Sheet, User } from '@/lib/database.types'

interface SupplierDetails {
  company: Company
  contacts: User[]
  sheets: Sheet[]
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'completed':
    case 'approved':
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
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          {status || 'Unknown'}
        </Badge>
      )
  }
}

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supplierId = params.id as string

  const [details, setDetails] = useState<SupplierDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSupplierDetails() {
      const supabase = createClient()

      // Fetch company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', supplierId)
        .single()

      if (companyError || !company) {
        console.error('Error fetching company:', companyError)
        setLoading(false)
        return
      }

      // Fetch contacts
      const { data: contacts } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', supplierId)
        .order('is_company_main_contact', { ascending: false })

      // Fetch sheets assigned to this supplier
      const { data: sheets } = await supabase
        .from('sheets')
        .select('*')
        .eq('requesting_company_id', supplierId)
        .order('modified_at', { ascending: false })

      setDetails({
        company,
        contacts: contacts || [],
        sheets: sheets || []
      })
      setLoading(false)
    }

    if (supplierId) {
      fetchSupplierDetails()
    }
  }, [supplierId])

  if (loading) {
    return (
      <AppLayout title="Supplier Details">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading supplier...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!details) {
    return (
      <AppLayout title="Supplier Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Building2 className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Supplier not found</p>
          <Button variant="outline" onClick={() => router.push('/suppliers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </div>
      </AppLayout>
    )
  }

  const { company, contacts, sheets } = details
  const primaryContact = contacts.find(c => c.is_company_main_contact) || contacts[0]
  const completedSheets = sheets.filter(s => s.status === 'completed' || s.status === 'approved').length
  const inProgressSheets = sheets.filter(s => s.status === 'in_progress').length
  const pendingSheets = sheets.filter(s => s.status === 'pending').length

  return (
    <AppLayout title={company.name}>
      <div className="space-y-6">
        {/* Back button and header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/suppliers')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Product Sheet
          </Button>
        </div>

        {/* Stats and contact info */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
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

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Product sheets - takes 2/3 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Sheets</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="h-12 w-12 opacity-30" />
                            <span>No product sheets yet</span>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Sheet
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sheets.map((sheet) => (
                        <TableRow
                          key={sheet.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/sheets/${sheet.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">{sheet.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(sheet.status)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {sheet.modified_at
                              ? new Date(sheet.modified_at).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Contact info - takes 1/3 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Primary Contact</CardTitle>
              </CardHeader>
              <CardContent>
                {primaryContact ? (
                  <div className="space-y-3">
                    <div className="font-medium text-lg">
                      {primaryContact.full_name ||
                       `${primaryContact.first_name || ''} ${primaryContact.last_name || ''}`.trim() ||
                       'No name'}
                    </div>
                    {primaryContact.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a
                          href={`mailto:${primaryContact.email}`}
                          className="hover:text-foreground transition-colors"
                        >
                          {primaryContact.email}
                        </a>
                      </div>
                    )}
                    {primaryContact.phone_text && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{primaryContact.phone_text}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No contact assigned</p>
                )}
              </CardContent>
            </Card>

            {contacts.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Other Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contacts
                      .filter(c => c.id !== primaryContact?.id)
                      .slice(0, 3)
                      .map(contact => (
                        <div key={contact.id} className="text-sm">
                          <div className="font-medium">
                            {contact.full_name ||
                             `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
                             'No name'}
                          </div>
                          {contact.email && (
                            <div className="text-muted-foreground">{contact.email}</div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Download,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ChemicalEntry {
  id: string
  sheetName: string
  companyName: string
  chemicalName: string
  casNumber: string
  concentration: string
  hasRestrictions: boolean
}

export default function ChemicalInventoryReport() {
  const [chemicals, setChemicals] = useState<ChemicalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalEntries: 0,
    uniqueChemicals: 0,
    withRestrictions: 0,
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Get list table answers that contain chemical data
      // Look for answers to questions about chemicals, substances, CAS numbers
      const { data: answers } = await supabase
        .from('answers')
        .select(`
          id,
          text_value,
          sheet_id,
          parent_question_id,
          list_table_column_id
        `)
        .not('text_value', 'is', null)
        .not('list_table_row_id', 'is', null)
        .limit(500)

      // Get related sheets and companies
      const { data: sheets } = await supabase
        .from('sheets')
        .select('id, name, assigned_to_company_id')

      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')

      const { data: columns } = await supabase
        .from('list_table_columns')
        .select('id, name')

      // Build lookup maps
      const sheetMap = new Map((sheets || []).map(s => [s.id, s]))
      const companyMap = new Map((companies || []).map(c => [c.id, c]))
      const columnMap = new Map((columns || []).map(c => [c.id, c]))

      // Filter for chemical-related columns
      const chemicalColumns = new Set(
        (columns || [])
          .filter(c => {
            const name = c.name?.toLowerCase() || ''
            return name.includes('chemical') ||
                   name.includes('cas') ||
                   name.includes('substance') ||
                   name.includes('name') ||
                   name.includes('concentration')
          })
          .map(c => c.id)
      )

      // Process answers into chemical entries
      const chemicalEntries: ChemicalEntry[] = []
      const seenCombinations = new Set()

      ;(answers || []).forEach(answer => {
        if (!answer.list_table_column_id || !chemicalColumns.has(answer.list_table_column_id)) return

        const column = columnMap.get(answer.list_table_column_id)
        const sheet = sheetMap.get(answer.sheet_id)
        const company = sheet ? companyMap.get(sheet.assigned_to_company_id) : null

        const columnName = column?.name?.toLowerCase() || ''
        const key = `${answer.sheet_id}-${answer.text_value}`

        if (seenCombinations.has(key)) return
        seenCombinations.add(key)

        const entry: ChemicalEntry = {
          id: answer.id,
          sheetName: sheet?.name || 'Unknown',
          companyName: company?.name || 'Unknown',
          chemicalName: columnName.includes('chemical') || columnName.includes('name') || columnName.includes('substance')
            ? answer.text_value || ''
            : '',
          casNumber: columnName.includes('cas') ? answer.text_value || '' : '',
          concentration: columnName.includes('conc') || columnName.includes('%') || columnName.includes('ppm')
            ? answer.text_value || ''
            : '',
          hasRestrictions: answer.text_value?.toLowerCase().includes('restrict') ||
                          answer.text_value?.toLowerCase().includes('limit') || false,
        }

        if (entry.chemicalName || entry.casNumber) {
          chemicalEntries.push(entry)
        }
      })

      // Calculate stats
      const uniqueChemicals = new Set(chemicalEntries.map(c => c.chemicalName || c.casNumber)).size
      const withRestrictions = chemicalEntries.filter(c => c.hasRestrictions).length

      setChemicals(chemicalEntries)
      setStats({
        totalEntries: chemicalEntries.length,
        uniqueChemicals,
        withRestrictions,
      })
      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredChemicals = chemicals.filter(c =>
    c.chemicalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.casNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppLayout title="Chemical Inventory Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Chemical Inventory Report
              </h1>
              <p className="text-muted-foreground mt-1">
                Complete inventory of chemicals across all supplier questionnaires
              </p>
            </div>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalEntries}</p>
                  <p className="text-sm text-muted-foreground">Total Chemical Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.uniqueChemicals}</p>
                  <p className="text-sm text-muted-foreground">Unique Chemicals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.withRestrictions}</p>
                  <p className="text-sm text-muted-foreground">With Restrictions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by chemical name, CAS number, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chemical Entries ({filteredChemicals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Chemical/Substance</th>
                      <th className="text-left py-3 px-4 font-medium">CAS Number</th>
                      <th className="text-left py-3 px-4 font-medium">Supplier</th>
                      <th className="text-left py-3 px-4 font-medium">Product</th>
                      <th className="text-center py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChemicals.slice(0, 100).map((chemical, idx) => (
                      <tr key={chemical.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                        <td className="py-3 px-4">{chemical.chemicalName || '-'}</td>
                        <td className="py-3 px-4 font-mono text-sm">{chemical.casNumber || '-'}</td>
                        <td className="py-3 px-4">{chemical.companyName}</td>
                        <td className="py-3 px-4">{chemical.sheetName}</td>
                        <td className="text-center py-3 px-4">
                          {chemical.hasRestrictions ? (
                            <Badge className="bg-amber-100 text-amber-700">Has Restrictions</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">Compliant</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredChemicals.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Showing first 100 of {filteredChemicals.length} entries
                  </p>
                )}
                {filteredChemicals.length === 0 && !loading && (
                  <p className="text-center py-8 text-muted-foreground">
                    No chemical entries found matching your search
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

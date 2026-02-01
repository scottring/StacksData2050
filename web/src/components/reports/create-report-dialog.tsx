'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Download, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CreateReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ReportOptions {
  includeSheets: boolean
  includeCompanies: boolean
  includeAnswers: boolean
  onlyMyCompany: boolean
}

export function CreateReportDialog({ open, onOpenChange }: CreateReportDialogProps) {
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<ReportOptions>({
    includeSheets: true,
    includeCompanies: true,
    includeAnswers: false,
    onlyMyCompany: true,
  })

  const handleExport = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      // Get user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const companyId = userData?.company_id

      // Fetch data based on options
      let csvContent = ''
      const timestamp = new Date().toISOString().split('T')[0]

      if (options.includeSheets) {
        const { data: allSheets } = await supabase
          .from('sheets')
          .select('id, name, status, company_id, requesting_company_id, created_at, modified_at')

        let sheets = allSheets || []
        if (options.onlyMyCompany && !isSuperAdmin && companyId) {
          sheets = sheets.filter(
            s => s.company_id === companyId || s.requesting_company_id === companyId
          )
        }

        // Get company names
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')

        const companyMap = new Map((companies || []).map(c => [c.id, c.name]))

        csvContent += 'SHEETS REPORT\n'
        csvContent += 'Name,Status,Supplier,Customer,Created,Modified\n'
        sheets.forEach(s => {
          csvContent += `"${s.name || ''}","${s.status || 'draft'}","${companyMap.get(s.company_id) || ''}","${companyMap.get(s.requesting_company_id) || ''}","${s.created_at || ''}","${s.modified_at || ''}"\n`
        })
        csvContent += `\nTotal Sheets: ${sheets.length}\n\n`
      }

      if (options.includeCompanies) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, location, active')

        let filteredCompanies = companies || []

        if (options.onlyMyCompany && !isSuperAdmin && companyId) {
          // Get related companies from sheets
          const { data: sheets } = await supabase
            .from('sheets')
            .select('company_id, requesting_company_id')

          const mySheets = (sheets || []).filter(
            s => s.company_id === companyId || s.requesting_company_id === companyId
          )

          const relatedIds = new Set<string>()
          mySheets.forEach(s => {
            if (s.company_id) relatedIds.add(s.company_id)
            if (s.requesting_company_id) relatedIds.add(s.requesting_company_id)
          })

          filteredCompanies = filteredCompanies.filter(c => relatedIds.has(c.id))
        }

        csvContent += 'COMPANIES REPORT\n'
        csvContent += 'Name,Location,Active\n'
        filteredCompanies.forEach(c => {
          csvContent += `"${c.name || ''}","${c.location || ''}","${c.active ? 'Yes' : 'No'}"\n`
        })
        csvContent += `\nTotal Companies: ${filteredCompanies.length}\n\n`
      }

      if (options.includeAnswers) {
        // Get sheets first for filtering
        const { data: allSheets } = await supabase
          .from('sheets')
          .select('id, name, company_id, requesting_company_id')

        let sheets = allSheets || []
        if (options.onlyMyCompany && !isSuperAdmin && companyId) {
          sheets = sheets.filter(
            s => s.company_id === companyId || s.requesting_company_id === companyId
          )
        }

        const sheetIds = sheets.map(s => s.id)
        const sheetMap = new Map(sheets.map(s => [s.id, s.name]))

        const { data: answers } = await supabase
          .from('answers')
          .select('id, sheet_id, text_value, number_value, boolean_value')
          .in('sheet_id', sheetIds.length > 0 ? sheetIds : ['none'])
          .limit(1000)

        csvContent += 'ANSWERS SUMMARY\n'
        csvContent += 'Sheet,Text Value,Number Value,Boolean Value\n'
        ;(answers || []).slice(0, 500).forEach(a => {
          csvContent += `"${sheetMap.get(a.sheet_id) || ''}","${a.text_value || ''}","${a.number_value || ''}","${a.boolean_value !== null ? a.boolean_value : ''}"\n`
        })
        csvContent += `\nTotal Answers: ${(answers || []).length}\n`
      }

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `custom-report-${timestamp}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onOpenChange(false)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Custom Report
          </DialogTitle>
          <DialogDescription>
            Select the data you want to include in your custom report export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include in report:</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sheets"
                checked={options.includeSheets}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, includeSheets: checked === true }))
                }
              />
              <label htmlFor="sheets" className="text-sm cursor-pointer">
                Product Sheets (name, status, companies, dates)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="companies"
                checked={options.includeCompanies}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, includeCompanies: checked === true }))
                }
              />
              <label htmlFor="companies" className="text-sm cursor-pointer">
                Companies (name, location, status)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="answers"
                checked={options.includeAnswers}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, includeAnswers: checked === true }))
                }
              />
              <label htmlFor="answers" className="text-sm cursor-pointer">
                Answer Data (limited to 500 rows)
              </label>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="myCompany"
                checked={options.onlyMyCompany}
                onCheckedChange={(checked) =>
                  setOptions(prev => ({ ...prev, onlyMyCompany: checked === true }))
                }
              />
              <label htmlFor="myCompany" className="text-sm cursor-pointer">
                Only include data related to my company
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Uncheck to include all accessible data (super admins see everything)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || (!options.includeSheets && !options.includeCompanies && !options.includeAnswers)}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

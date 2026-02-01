'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Download,
  Loader2,
  Check,
  FileText,
  Table2,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Sheet {
  id: string
  name: string
  status: string
  company_name: string
}

export function ExcelExportTab() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [sapFormat, setSapFormat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingSheets, setLoadingSheets] = useState(true)
  const [exportSuccess, setExportSuccess] = useState(false)

  useEffect(() => {
    const fetchSheets = async () => {
      setLoadingSheets(true)
      const supabase = createClient()

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.user.id)
        .single()

      if (!userData) return

      const { data, error } = await supabase
        .from('sheets')
        .select(`
          id,
          name,
          status,
          companies!sheets_company_id_fkey(name)
        `)
        .or(`company_id.eq.${userData.company_id},requesting_company_id.eq.${userData.company_id}`)
        .order('modified_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setSheets(data.map(s => {
          // Handle the company relationship - could be object or array
          const company = s.companies as { name: string } | { name: string }[] | null
          const companyName = Array.isArray(company)
            ? company[0]?.name
            : company?.name
          return {
            id: s.id,
            name: s.name || 'Untitled Sheet',
            status: s.status || 'draft',
            company_name: companyName || 'Unknown'
          }
        }))
      }
      setLoadingSheets(false)
    }

    fetchSheets()
  }, [])

  const handleSheetToggle = (sheetId: string, checked: boolean) => {
    if (checked) {
      setSelectedSheets([...selectedSheets, sheetId])
    } else {
      setSelectedSheets(selectedSheets.filter(id => id !== sheetId))
    }
  }

  const handleSelectAll = () => {
    if (selectedSheets.length === sheets.length) {
      setSelectedSheets([])
    } else {
      setSelectedSheets(sheets.map(s => s.id))
    }
  }

  const handleExport = async () => {
    if (selectedSheets.length === 0) return

    setLoading(true)
    setExportSuccess(false)

    try {
      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_ids: selectedSheets,
          format,
          include_metadata: includeMetadata,
          sap_format: sapFormat
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `stacks-export-${Date.now()}.${format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700'
      case 'submitted': return 'bg-blue-100 text-blue-700'
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'flagged': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Excel Export</CardTitle>
          </div>
          <CardDescription>
            Export your compliance data sheets to Excel or CSV format for sharing with customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={format} onValueChange={(v: 'xlsx' | 'csv') => setFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel (.xlsx)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CSV (.csv)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label>Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={includeMetadata}
                    onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
                  />
                  <label htmlFor="metadata" className="text-sm cursor-pointer">
                    Include metadata (dates, tags, company info)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sap"
                    checked={sapFormat}
                    onCheckedChange={(checked) => setSapFormat(checked === true)}
                  />
                  <label htmlFor="sap" className="text-sm cursor-pointer">
                    SAP-compatible format
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Export includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Summary sheet with product and supplier information</li>
                <li>All questions and answers organized by section</li>
                <li>List tables expanded with all rows and columns</li>
                {includeMetadata && <li>Metadata sheet with tags, dates, and compliance status</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sheet Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Select Sheets to Export</CardTitle>
              <CardDescription>
                Choose one or more sheets to include in the export
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedSheets.length === sheets.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSheets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sheets.length === 0 ? (
            <div className="text-center py-8">
              <Table2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No sheets available</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any sheets to export yet
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedSheets.includes(sheet.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedSheets.includes(sheet.id)}
                      onCheckedChange={(checked) =>
                        handleSheetToggle(sheet.id, checked === true)
                      }
                    />
                    <div>
                      <p className="font-medium text-sm">{sheet.name}</p>
                      <p className="text-xs text-muted-foreground">{sheet.company_name}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(sheet.status)}>
                    {sheet.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Export Button */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedSheets.length} sheet{selectedSheets.length !== 1 ? 's' : ''} selected
            </p>
            <Button
              onClick={handleExport}
              disabled={loading || selectedSheets.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Exported!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, XCircle, 
  Loader2, Building2, Package, ArrowRight 
} from 'lucide-react'

interface Metadata {
  supplierName: string | null
  supplierAddress: string | null
  supplierEmail: string | null
  supplierContact: string | null
  submissionDate: string | null
  productName: string | null
  productDescription: string | null
  producer: string | null
}

interface ImportPreview {
  success: boolean
  metadata: Metadata
  fileName: string
  totalQuestions: number
  matchedQuestions: number
  answeredQuestions: number
  issueCount: number
  answers: any[]
  issues: any[]
  listTables?: {
    rowCount: number
    cellCount: number
    tables: Array<{
      questionNumber: string
      description: string
      rowsFound: number
    }>
  }
}

interface ImportResult {
  success: boolean
  sheetId: string
  sheetName: string
  supplierCompanyId: string
  supplierName: string
  answersImported: number
  listTableCellsImported?: number
}

interface ManufacturerExcelImportProps {
  manufacturerCompanyId: string
  manufacturerCompanyName: string
}

export function ManufacturerExcelImport({ 
  manufacturerCompanyId, 
  manufacturerCompanyName 
}: ManufacturerExcelImportProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(null)
      setResult(null)
      setError(null)
    }
  }, [])

  const handleAnalyze = async () => {
    if (!file) return
    
    setUploading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', 'preview')
      
      const response = await fetch('/api/import/manufacturer', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      
      setPreview(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleImport = async () => {
    if (!file || !preview) return
    
    setImporting(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', 'import')
      formData.append('manufacturerCompanyId', manufacturerCompanyId)
      
      const response = await fetch('/api/import/manufacturer', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }
      
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // All answers with values will be imported (issues will be stored as text)
  const readyAnswers = preview?.answers.filter((a: any) =>
    a.mappedValue !== null
  ) || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Excel Workbook
        </CardTitle>
        <CardDescription>
          Importing as: <strong>{manufacturerCompanyName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        {!preview && !result && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Click to select Excel file</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PPVIS HQ 2.1 workbooks (.xlsx)
                </p>
              </label>
            </div>
            
            {file && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button onClick={handleAnalyze} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze File'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {preview && !result && (
          <div className="space-y-6">
            {/* Extracted Metadata */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Supplier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold text-lg">{preview.metadata.supplierName || 'Unknown'}</p>
                  {preview.metadata.supplierAddress && (
                    <p className="text-sm text-muted-foreground">{preview.metadata.supplierAddress}</p>
                  )}
                  {preview.metadata.submissionDate && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted: {preview.metadata.submissionDate}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Product
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold text-lg">{preview.metadata.productName || 'Unknown'}</p>
                  {preview.metadata.productDescription && (
                    <p className="text-sm text-muted-foreground">{preview.metadata.productDescription}</p>
                  )}
                  {preview.metadata.producer && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Producer: {preview.metadata.producer}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{preview.matchedQuestions}</div>
                <div className="text-xs text-muted-foreground">Matched</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{preview.answeredQuestions}</div>
                <div className="text-xs text-muted-foreground">With Answers</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{readyAnswers.length}</div>
                <div className="text-xs text-muted-foreground">Ready to Import</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{preview.issueCount}</div>
                <div className="text-xs text-muted-foreground">Issues</div>
              </div>
            </div>

            {/* List Tables */}
            {preview.listTables && preview.listTables.rowCount > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  Table Data Found
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {preview.listTables.rowCount} rows ({preview.listTables.cellCount} cells) from:
                </p>
                <div className="space-y-1">
                  {preview.listTables.tables.filter(t => t.rowsFound > 0).map((table, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{table.questionNumber}</Badge>
                      <span>{table.description}</span>
                      <span className="text-muted-foreground">({table.rowsFound} rows)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            {preview.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Issues ({preview.issues.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {preview.issues.slice(0, 5).map((issue: any, i: number) => (
                    <div key={i} className="p-2 bg-orange-50 rounded">
                      <span className="font-medium">{issue.question?.substring(0, 50)}...</span>
                      <span className="text-muted-foreground ml-2">"{issue.excelValue}"</span>
                    </div>
                  ))}
                  {preview.issues.length > 5 && (
                    <p className="text-muted-foreground">+{preview.issues.length - 5} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Import Flow Explanation */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next:</strong> A sheet will be created with status "imported". 
                You'll review it, then send it to <strong>{preview.metadata.supplierName}</strong> for confirmation. 
                The supplier must verify and submit before you can approve.
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPreview(null)
                  setFile(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={importing || readyAnswers.length === 0}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Sheet...
                  </>
                ) : (
                  <>
                    Import {readyAnswers.length} Answers
                    {preview?.listTables?.cellCount ? ` + ${preview.listTables.cellCount} Table Cells` : ''}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Sheet created!</strong> Imported {result.answersImported} answers
                {result.listTableCellsImported ? ` + ${result.listTableCellsImported} table cells` : ''} for "{result.sheetName}"
                from {result.supplierName}.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setPreview(null)
                  setFile(null)
                  setResult(null)
                }}
              >
                Import Another
              </Button>
              <Button 
                onClick={() => router.push(`/sheets/${result.sheetId}`)}
                className="flex-1"
              >
                Review Imported Sheet
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

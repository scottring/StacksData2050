'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'

interface MappedAnswer {
  bubbleId: string
  questionId: string | null
  questionText: string
  section: string
  subsection: string
  excelValue: string | null
  mappedValue: any
  valueType: string
  choiceId?: string
  choiceText?: string
  isRequired: boolean
  hasIssue: boolean
  issueType?: string
  issueDetails?: string
}

interface ListTablePreview {
  questionId: string
  questionText: string
  sheetName: string
  headerRow: number
  columns: Array<{
    excelCol: string
    headerText: string
    columnId: string | null
    columnName: string | null
  }>
  rows: Array<Record<string, string>>
}

interface ImportPreview {
  success: boolean
  fileName: string
  totalQuestions: number
  matchedQuestions: number
  answeredQuestions: number
  issueCount: number
  answers: MappedAnswer[]
  listTables: ListTablePreview[]
  issues: Array<{
    type: string
    question: string
    excelValue: string | null
    details: string
  }>
  debug?: {
    workbookSheets: string[]
    sheetNameMapping: Record<string, string>
    cellsChecked: number
    valuesFound: number
    sampleValues?: Array<{ question: string; value: string }>
    cellLookupCount?: number
    formulaMapCount?: number
  }
}

interface ExcelImportProps {
  sheetId: string
  companyId: string
  onImportComplete?: () => void
}

export function ExcelImport({ sheetId, companyId, onImportComplete }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(null)
      setImportResult(null)
      setError(null)
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return
    
    setUploading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }
      
      setPreview(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleImport = async () => {
    if (!preview) return
    
    setImporting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId,
          companyId,
          // Include all answers with values (issues will be imported as text)
          answers: preview.answers.filter(a => a.mappedValue !== null),
          listTables: preview.listTables ?? []
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }
      
      setImportResult(result)
      onImportComplete?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const answersWithValues = preview?.answers.filter(a => a.mappedValue !== null && a.excelValue) || []
  const answersWithIssues = preview?.answers.filter(a => a.hasIssue) || []
  // All answers with values will be imported (issues will be stored as text)
  const readyToImport = answersWithValues

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import from Excel
        </CardTitle>
        <CardDescription>
          Upload a PPVIS HQ 2.1 Excel workbook to import answers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        {!preview && !importResult && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  .xlsx or .xls files only
                </p>
              </label>
            </div>
            
            {file && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button onClick={handleUpload} disabled={uploading}>
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

        {/* Preview Results */}
        {preview && !importResult && (
          <div className="space-y-4">
            {/* Debug Info */}
            {preview.debug && (
              <div className="p-3 bg-slate-100 rounded-lg text-xs font-mono space-y-1">
                <div className="font-semibold mb-1">Debug Info:</div>
                <div><strong>Workbook sheets:</strong> {preview.debug.workbookSheets?.join(', ')}</div>
                <div><strong>Sheet mapping:</strong> {JSON.stringify(preview.debug.sheetNameMapping)}</div>
                <div><strong>Formula map:</strong> {preview.debug.formulaMapCount} questions, <strong>Cell lookup:</strong> {preview.debug.cellLookupCount} mappings</div>
                <div><strong>Cells checked:</strong> {preview.debug.cellsChecked}, <strong>Values found:</strong> {preview.debug.valuesFound}</div>
                {preview.debug.sampleValues && preview.debug.sampleValues.length > 0 && (
                  <div className="mt-2">
                    <div className="font-semibold">Sample values found:</div>
                    {preview.debug.sampleValues.map((s: any, i: number) => (
                      <div key={i} className="ml-2 truncate">• {s.question}... = "{s.value}"</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{preview.totalQuestions}</div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{preview.matchedQuestions}</div>
                <div className="text-xs text-muted-foreground">Matched</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{readyToImport.length}</div>
                <div className="text-xs text-muted-foreground">Ready</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{preview.issueCount}</div>
                <div className="text-xs text-muted-foreground">Issues</div>
              </div>
            </div>

            {/* Issues */}
            {preview.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Issues to Review ({preview.issues.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {preview.issues.slice(0, 10).map((issue, i) => (
                    <div key={i} className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {issue.type.replace('_', ' ')}
                        </Badge>
                        <span className="font-medium truncate">{issue.question?.substring(0, 50)}...</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        Value: "{issue.excelValue}" — {issue.details}
                      </div>
                    </div>
                  ))}
                  {preview.issues.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ...and {preview.issues.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sample Answers */}
            <div className="space-y-2">
              <h4 className="font-medium">Sample Answers ({answersWithValues.length} total)</h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {answersWithValues.slice(0, 15).map((answer, i) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded text-sm flex items-start gap-2 ${
                      answer.hasIssue ? 'bg-orange-50' : 'bg-green-50'
                    }`}
                  >
                    {answer.hasIssue ? (
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{answer.questionText?.substring(0, 60)}...</div>
                      <div className="text-muted-foreground truncate">
                        {answer.choiceText || answer.mappedValue}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{answer.valueType}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* List tables, shown with their structure so the supplier can
                see the substance lists arrived intact before confirming. */}
            {preview.listTables && preview.listTables.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">
                  Tables ({preview.listTables.length}, {preview.listTables.reduce((n, t) => n + t.rows.length, 0)} rows)
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {preview.listTables.map(table => (
                    <div key={table.questionId} className="rounded-lg border">
                      <div className="px-3 py-2 border-b bg-muted/40 text-sm">
                        <span className="font-medium">{table.questionText}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{table.sheetName} row {table.headerRow}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/20">
                              {table.columns.map(col => (
                                <th key={col.excelCol} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                                  {col.headerText.replace(/\s+/g, ' ')}
                                  {!col.columnId && (
                                    <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1">new</Badge>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, i) => (
                              <tr key={i} className="border-t">
                                {table.columns.map(col => (
                                  <td key={col.excelCol} className="px-2 py-1.5 align-top max-w-[220px]">
                                    {row[col.excelCol] ?? <span className="text-muted-foreground">-</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
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
                disabled={importing || (readyToImport.length === 0 && !(preview.listTables?.length))}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {readyToImport.length} Answers
                    {preview.listTables?.length ? ` + ${preview.listTables.length} Tables` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Import Complete */}
        {importResult && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully imported {importResult.answersInserted} answers
                {importResult.listTablesImported ? ` and ${importResult.listTablesImported} tables (${importResult.listTableCellsInserted} cells)` : ''} to "{importResult.sheetName}"
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => {
                setPreview(null)
                setFile(null)
                setImportResult(null)
              }}
              variant="outline"
              className="w-full"
            >
              Import Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

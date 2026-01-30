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

interface ImportPreview {
  success: boolean
  fileName: string
  totalQuestions: number
  matchedQuestions: number
  answeredQuestions: number
  issueCount: number
  answers: MappedAnswer[]
  issues: Array<{
    type: string
    question: string
    excelValue: string | null
    details: string
  }>
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
          answers: preview.answers.filter(a => !a.hasIssue && a.mappedValue !== null)
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
  const readyToImport = answersWithValues.filter(a => !a.hasIssue)

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
                disabled={importing || readyToImport.length === 0}
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
                Successfully imported {importResult.answersInserted} answers to "{importResult.sheetName}"
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

'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { FileUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ProcessingStepper from './processing-stepper'

interface UploadDropzoneProps {
  onUploadComplete: (docId: string) => void
  sheetId?: string
  defaultDocType?: string
}

const DOC_TYPES = [
  { value: 'sds', label: 'Safety Data Sheet (SDS)' },
  { value: 'coa', label: 'Certificate of Analysis (CoA)' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'sap_csv', label: 'SAP Export (CSV)' },
  { value: 'questionnaire', label: 'Customer Questionnaire (Blank)' },
  { value: 'questionnaire_filled', label: 'Customer Questionnaire (Completed)' },
  { value: 'other', label: 'Other Document' },
]

export default function UploadDropzone({ onUploadComplete, sheetId, defaultDocType }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState(defaultDocType || 'sds')
  const [error, setError] = useState<string | null>(null)

  // Sync docType when parent changes the defaultDocType prop
  useEffect(() => {
    if (defaultDocType) setDocType(defaultDocType)
  }, [defaultDocType])

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const [processStatus, setProcessStatus] = useState<'processing' | 'complete' | 'error'>('processing')
  const abortRef = useRef<AbortController | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0])
      setError(null)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }, [])

  const handleUploadAndProcess = async () => {
    if (!file) return

    setIsProcessing(true)
    setCurrentStep(0)
    setStepMessage('Uploading file...')
    setProcessStatus('processing')
    setError(null)

    try {
      // Step 1: Upload the file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', docType)
      if (sheetId) formData.append('sheet_id', sheetId)

      const uploadRes = await fetch('/api/extraction/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: `Upload failed with status ${uploadRes.status}` }))
        console.error('[upload] Server error:', err)
        throw new Error(err.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      const documentId = uploadData.id

      // Step 2: Connect to SSE stream for processing
      const abort = new AbortController()
      abortRef.current = abort

      const streamRes = await fetch('/api/extraction/process-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId }),
        signal: abort.signal,
      })

      if (!streamRes.ok) {
        const errText = await streamRes.text()
        throw new Error(errText || 'Processing failed')
      }

      const reader = streamRes.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let gotTerminalEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.status === 'complete') {
              gotTerminalEvent = true
              setCurrentStep(4)
              setProcessStatus('complete')
              setStepMessage('')
              // Brief delay to show the complete state, then navigate
              setTimeout(() => onUploadComplete(documentId), 1500)
              return
            }

            if (data.status === 'error') {
              gotTerminalEvent = true
              setProcessStatus('error')
              setError(data.error || 'Processing failed')
              return
            }

            if (typeof data.step === 'number') {
              setCurrentStep(data.step)
              if (data.message) setStepMessage(data.message)
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Stream ended without a terminal event — treat as error, not success
      if (!gotTerminalEvent) {
        setProcessStatus('error')
        setError('Processing stream ended unexpectedly. Check server logs.')
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setProcessStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleReset = () => {
    setIsProcessing(false)
    setCurrentStep(0)
    setStepMessage('')
    setProcessStatus('processing')
    setFile(null)
    setError(null)
    abortRef.current?.abort()
    abortRef.current = null
  }

  // Show stepper during processing
  if (isProcessing) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white">
          {file && (
            <div className="px-6 pt-5 text-center">
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          )}

          <ProcessingStepper
            currentStep={currentStep}
            status={processStatus}
            error={error || undefined}
            message={stepMessage}
          />
        </div>

        {processStatus === 'error' && (
          <div className="text-center">
            <Button variant="outline" onClick={handleReset} size="sm">
              Try Again
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50'
            : file
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <input
          type="file"
          accept=".pdf,.csv,.xls,.xlsx,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {file ? (
          <div className="text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {(file.size / 1024).toFixed(0)} KB &middot; {file.type || 'unknown type'}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="mt-2 text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Change file
            </button>
          </div>
        ) : (
          <div className="text-center">
            <FileUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              Drop a document here or click to browse
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PDF, CSV, Excel &middot; Max 50MB
            </p>
          </div>
        )}
      </div>

      {/* Document type selector */}
      <div className="flex items-center gap-3">
        {!defaultDocType && (
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          onClick={handleUploadAndProcess}
          disabled={!file}
          className={defaultDocType ? 'w-full' : 'min-w-[140px]'}
        >
          <FileUp className="h-4 w-4 mr-2" /> Upload & Extract
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

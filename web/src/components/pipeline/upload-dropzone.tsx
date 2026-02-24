'use client'

import { useCallback, useState } from 'react'
import { FileUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UploadDropzoneProps {
  onUploadComplete: (docId: string) => void
}

const DOC_TYPES = [
  { value: 'sds', label: 'Safety Data Sheet (SDS)' },
  { value: 'coa', label: 'Certificate of Analysis (CoA)' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'sap_csv', label: 'SAP Export (CSV)' },
  { value: 'other', label: 'Other Document' },
]

export default function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('sds')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // Step 1: Upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', docType)

      const uploadRes = await fetch('/api/extraction/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      setUploading(false)
      setProcessing(true)

      // Step 2: Process with Claude
      const processRes = await fetch('/api/extraction/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: uploadData.id }),
      })

      if (!processRes.ok) {
        const err = await processRes.json()
        throw new Error(err.error || 'Processing failed')
      }

      setProcessing(false)
      setSuccess(true)
      onUploadComplete(uploadData.id)
    } catch (err) {
      setUploading(false)
      setProcessing(false)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const isProcessing = uploading || processing

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
          disabled={isProcessing}
        />
        {file ? (
          <div className="text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              {(file.size / 1024).toFixed(0)} KB &middot; {file.type || 'unknown type'}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setSuccess(false) }}
              className="mt-2 text-xs text-slate-500 hover:text-slate-700 underline"
              disabled={isProcessing}
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
        <Select value={docType} onValueChange={setDocType} disabled={isProcessing}>
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

        <Button
          onClick={handleUploadAndProcess}
          disabled={!file || isProcessing}
          className="min-w-[140px]"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</>
          ) : processing ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Extracting...</>
          ) : success ? (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Done</>
          ) : (
            <><FileUp className="h-4 w-4 mr-2" /> Upload & Extract</>
          )}
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

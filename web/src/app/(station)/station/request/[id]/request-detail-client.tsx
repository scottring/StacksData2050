'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileUp,
  CheckCircle2,
  FileText,
  Sparkles,
  Building2,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import UploadDropzone from '@/components/pipeline/upload-dropzone'

interface RequestInfo {
  id: string
  productName: string
  createdAt: string
  customerComment: string | null
  sheetId: string
  sheetStatus: string
  customerName: string
  customerLogo: string | null
  tags: string[]
  questionCount: number
  docsUploaded: number
  extractionItemCount: number
  answersCount: number
}

interface ExtractionDoc {
  id: string
  fileName: string
  documentType: string
  status: string
  createdAt: string
}

interface StationRequestDetailProps {
  request: RequestInfo
  extractionDocs: ExtractionDoc[]
}

export default function StationRequestDetail({ request, extractionDocs }: StationRequestDetailProps) {
  const router = useRouter()
  const [docs, setDocs] = useState(extractionDocs)
  const [showUpload, setShowUpload] = useState(false)

  const handleUploadComplete = useCallback((docId: string) => {
    // Refresh the page to get updated data
    setShowUpload(false)
    router.refresh()
  }, [router])

  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/extraction/${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== docId))
      }
    } catch {
      // Silent fail
    }
  }

  const completionPct = request.questionCount > 0
    ? Math.round((request.answersCount / request.questionCount) * 100)
    : 0

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Back nav */}
      <Link
        href="/station"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to requests
      </Link>

      {/* Request header */}
      <div className="rounded-2xl bg-zinc-900/60 border border-white/6 p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
            {request.customerLogo ? (
              <img src={request.customerLogo} alt="" className="h-12 w-12 object-cover" />
            ) : (
              <Building2 className="h-5 w-5 text-zinc-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-white">
              {request.productName}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Requested by <span className="text-zinc-400">{request.customerName}</span>
            </p>
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {request.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-400 ring-1 ring-emerald-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
            {request.customerComment && (
              <div className="mt-3 rounded-lg bg-zinc-800/50 px-3 py-2">
                <p className="text-xs text-zinc-500 italic">&ldquo;{request.customerComment}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-zinc-500">
              {request.answersCount} / {request.questionCount} parameters
            </span>
            <span className={`font-mono ${completionPct === 100 ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {completionPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-3">
        {/* Step 1: Upload */}
        <button
          onClick={() => setShowUpload(true)}
          className="group rounded-2xl bg-zinc-900/60 border border-white/6 hover:border-emerald-500/20 p-5 text-left transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileUp className="h-5 w-5 text-emerald-400" />
            </div>
            {docs.length > 0 && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {docs.length} uploaded
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
            Upload Documents
          </h3>
          <p className="text-xs text-zinc-600 mt-1">
            SDS, CoA, Lab Reports, Excel, SAP
          </p>
        </button>

        {/* Step 2: Extract */}
        <div className={`rounded-2xl bg-zinc-900/60 border border-white/6 p-5 ${
          request.extractionItemCount > 0 ? '' : 'opacity-50'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            {request.extractionItemCount > 0 && (
              <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                {request.extractionItemCount} items
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-white">AI Extraction</h3>
          <p className="text-xs text-zinc-600 mt-1">
            {request.extractionItemCount > 0
              ? 'Data extracted from your documents'
              : 'Upload documents to begin extraction'}
          </p>
        </div>

        {/* Step 3: Review & Submit */}
        <Link
          href={`/station/request/${request.id}/review`}
          className={`group rounded-2xl bg-zinc-900/60 border border-white/6 p-5 text-left transition-all ${
            request.extractionItemCount > 0
              ? 'hover:border-emerald-500/20'
              : 'opacity-50 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-blue-400" />
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
            Review & Submit
          </h3>
          <p className="text-xs text-zinc-600 mt-1">
            Verify mapped parameters, fill gaps
          </p>
        </Link>
      </div>

      {/* Upload section (expandable) */}
      {showUpload && (
        <div className="rounded-2xl bg-zinc-900/60 border border-white/6 p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Upload Documents</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Close
            </button>
          </div>
          <UploadDropzone onUploadComplete={handleUploadComplete} sheetId={request.sheetId} />
        </div>
      )}

      {/* Uploaded documents list */}
      {docs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Uploaded Documents
          </h2>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl bg-zinc-900/40 border border-white/4 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-zinc-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{doc.fileName}</p>
                    <p className="text-[10px] font-mono text-zinc-600">
                      {doc.documentType.toUpperCase()}
                      <span className="mx-1.5">&middot;</span>
                      {doc.status === 'extracted' ? (
                        <span className="text-emerald-500">Extracted</span>
                      ) : doc.status === 'processing' ? (
                        <span className="text-amber-400">Processing...</span>
                      ) : doc.status === 'failed' ? (
                        <span className="text-rose-400">Failed</span>
                      ) : (
                        <span>{doc.status}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDoc(doc.id)}
                  className="text-zinc-700 hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

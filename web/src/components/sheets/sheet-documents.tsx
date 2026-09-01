'use client'

/**
 * Sheet-level documents: supplier Regulatory Data Sheets, Safety Data Sheets,
 * and anything else that describes the product rather than answering a single
 * question. Both parties to a sheet see the same list -- the supplier attaches,
 * the customer downloads.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Upload, Download, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DOCUMENT_TYPES = ['RDS', 'SDS', 'Other'] as const

interface SheetDocument {
  id: string
  document_type: string | null
  file_name: string
  file_size: number
  created_at: string
  user_id: string
  download_url: string | null
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SheetDocuments({ sheetId }: { sheetId: string }) {
  const [documents, setDocuments] = useState<SheetDocument[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<string>('SDS')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/attachments?sheet_id=${sheetId}&scope=sheet`)
      if (!res.ok) throw new Error('Could not load documents')
      setDocuments(await res.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load documents')
    } finally {
      setLoading(false)
    }
  }, [sheetId])

  useEffect(() => {
    load()
  }, [load])

  // Only the uploader may remove a file, so the delete control needs to know
  // who is viewing.
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('sheet_id', sheetId)
      body.append('document_type', documentType)

      const res = await fetch('/api/attachments', { method: 'POST', body })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Upload failed')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Allow re-selecting the same file after a failure.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      const res = await fetch(`/api/attachments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not remove document')
      setDocuments(docs => docs.filter(d => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove document')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Documents
          {documents.length > 0 && (
            <Badge variant="outline">{documents.length}</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Regulatory and safety data sheets for this product. PDF, Word, Excel, CSV or image, up to 50MB.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {type === 'RDS'
                    ? 'Regulatory (RDS)'
                    : type === 'SDS'
                      ? 'Safety (SDS)'
                      : 'Other'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add document
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No documents attached yet.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {documents.map(doc => (
              <li key={doc.id} className="flex items-center gap-3 p-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{doc.file_name}</span>
                    {doc.document_type && (
                      <Badge variant="secondary" className="shrink-0">
                        {doc.document_type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                {doc.download_url && (
                  <a href={doc.download_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {currentUserId === doc.user_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

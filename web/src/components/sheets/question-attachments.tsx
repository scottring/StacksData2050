'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Upload, Loader2, ChevronDown, ChevronUp, X, FileText, FileSpreadsheet, FileImage, File, Download, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Attachment {
  id: string
  question_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
  download_url: string | null
  user_id: string
  users: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  } | null
}

interface QuestionAttachmentsProps {
  sheetId: string
  questionId: string
  compact?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-4 w-4 text-blue-500" />
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet className="h-4 w-4 text-green-500" />
  if (mimeType.includes('image')) return <FileImage className="h-4 w-4 text-purple-500" />
  return <File className="h-4 w-4 text-gray-500" />
}

export function QuestionAttachments({ sheetId, questionId, compact = true }: QuestionAttachmentsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch attachments when opened
  useEffect(() => {
    if (isOpen) {
      fetchAttachments()
    }
  }, [isOpen, sheetId, questionId])

  const fetchAttachments = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/attachments?sheet_id=${sheetId}&question_id=${questionId}`
      )
      if (response.ok) {
        const data = await response.json()
        setAttachments(data)
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || uploading) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sheet_id', sheetId)
      formData.append('question_id', questionId)

      const response = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const attachment = await response.json()
        setAttachments(prev => [attachment, ...prev])
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload file')
      }
    } catch (error) {
      console.error('Failed to upload attachment:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return

    setDeleting(attachmentId)
    try {
      const response = await fetch(`/api/attachments?id=${attachmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId))
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error)
    } finally {
      setDeleting(null)
    }
  }

  const attachmentCount = attachments.length

  // Compact mode - just show the paperclip button
  if (compact && !isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-7 px-2 text-muted-foreground hover:text-foreground"
        title="Attachments"
      >
        <Paperclip className="h-4 w-4" />
        {attachmentCount > 0 && (
          <span className="ml-1 text-xs">{attachmentCount}</span>
        )}
      </Button>
    )
  }

  return (
    <div className="border rounded-lg bg-muted/30 mt-2">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments {attachmentCount > 0 && `(${attachmentCount})`}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Attachments list */}
      {isOpen && (
        <div className="border-t px-3 py-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No attachments yet
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 p-2 rounded-md bg-background border text-sm">
                  {getFileIcon(attachment.mime_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={attachment.file_name}>
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {attachment.users?.first_name || 'User'} • {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {attachment.download_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <a href={attachment.download_url} download={attachment.file_name} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deleting === attachment.id}
                    >
                      {deleting === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <div className="pt-2 border-t">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif"
              className="hidden"
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              PDF, Word, Excel, CSV, images (max 50MB)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline attachment button - shows just the paperclip icon with count
 * Expands to full panel when clicked
 */
export function InlineAttachmentButton({ sheetId, questionId }: { sheetId: string, questionId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [attachmentCount, setAttachmentCount] = useState(0)

  // Fetch attachment count on mount
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch(
          `/api/attachments?sheet_id=${sheetId}&question_id=${questionId}`
        )
        if (response.ok) {
          const data = await response.json()
          setAttachmentCount(data.length)
        }
      } catch (error) {
        console.error('Failed to fetch attachment count:', error)
      }
    }
    fetchCount()
  }, [sheetId, questionId])

  if (isOpen) {
    return (
      <QuestionAttachments
        sheetId={sheetId}
        questionId={questionId}
        compact={false}
      />
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsOpen(true)}
      className="h-7 px-2 text-muted-foreground hover:text-foreground"
      title="Attachments"
    >
      <Paperclip className="h-4 w-4" />
      {attachmentCount > 0 && (
        <span className="ml-1 text-xs font-medium">{attachmentCount}</span>
      )}
    </Button>
  )
}

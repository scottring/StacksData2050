'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react'

export interface UploadedFile {
  name: string
  path: string
  size: number
  type: string
  uploadedAt: string
}

interface FileUploadInputProps {
  sheetId: string
  questionId: string
  existingFiles: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  disabled?: boolean
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
}

export function FileUploadInput({
  sheetId,
  questionId,
  existingFiles = [],
  onFilesChange,
  disabled = false,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg']
}: FileUploadInputProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return

    setError(null)

    // Check max files limit
    if (existingFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    const filesToUpload = Array.from(files)

    // Validate files
    for (const file of filesToUpload) {
      if (file.size > maxSizeBytes) {
        setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`)
        return
      }

      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.some(t => t.toLowerCase() === ext)) {
        setError(`File type "${ext}" not allowed`)
        return
      }
    }

    setUploading(true)
    const supabase = createClient()
    const newFiles: UploadedFile[] = []

    try {
      for (const file of filesToUpload) {
        // Create unique path: sheets/{sheetId}/questions/{questionId}/{timestamp}_{filename}
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `sheets/${sheetId}/questions/${questionId}/${timestamp}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('answer-files')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          // If bucket doesn't exist, show helpful error
          if (uploadError.message.includes('not found')) {
            throw new Error('Storage bucket not configured. Please contact support.')
          }
          throw uploadError
        }

        newFiles.push({
          name: file.name,
          path,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        })
      }

      onFilesChange([...existingFiles, ...newFiles])
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [sheetId, questionId, existingFiles, onFilesChange, disabled, maxFiles, maxSizeBytes, acceptedTypes])

  const handleRemoveFile = useCallback(async (fileToRemove: UploadedFile) => {
    if (disabled) return

    const supabase = createClient()

    try {
      // Delete from storage
      await supabase.storage
        .from('answer-files')
        .remove([fileToRemove.path])

      // Update state
      onFilesChange(existingFiles.filter(f => f.path !== fileToRemove.path))
    } catch (err) {
      console.error('Failed to remove file:', err)
      setError('Failed to remove file')
    }
  }, [existingFiles, onFilesChange, disabled])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileUrl = async (path: string) => {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('answer-files')
      .createSignedUrl(path, 3600) // 1 hour expiry

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${disabled ? 'bg-muted/50 cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/50'}
          ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <span>Drop files here or click to browse</span>
            <span className="text-xs">
              Max {maxSizeMB}MB per file, up to {maxFiles} files
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Uploaded files list */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          {existingFiles.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => getFileUrl(file.path)}
                    className="text-sm font-medium text-primary hover:underline truncate block max-w-[200px]"
                    title={file.name}
                  >
                    {file.name}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(file)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

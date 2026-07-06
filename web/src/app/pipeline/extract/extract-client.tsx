'use client'

import { useRouter } from 'next/navigation'
import UploadDropzone from '@/components/pipeline/upload-dropzone'

export default function ExtractPageClient() {
  const router = useRouter()

  const handleUploadComplete = (docId: string) => {
    // Navigate to the review page
    router.push(`/pipeline/extract/${docId}`)
  }

  return <UploadDropzone onUploadComplete={handleUploadComplete} />
}

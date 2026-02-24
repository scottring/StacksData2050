import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processDocument } from '@/lib/extraction/process'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json()
  const { document_id } = body

  if (!document_id) {
    return new Response('document_id is required', { status: 400 })
  }

  const { data: doc } = await supabase
    .from('extraction_documents')
    .select('id, status')
    .eq('id', document_id)
    .single()

  if (!doc) {
    return new Response('Document not found', { status: 404 })
  }

  if (doc.status === 'processing') {
    return new Response('Document is already being processed', { status: 409 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ step: 0, message: 'Uploading to storage...' })

        const result = await processDocument(document_id, {
          onPrepare: () => send({ step: 1, message: 'Converting format...' }),
          onExtract: () => send({ step: 2, message: 'Extracting with AI...' }),
          onParse: () => send({ step: 3, message: 'Mapping results...' }),
          onStore: () => send({ step: 4, message: 'Saving to database...' }),
        })

        if (result.status === 'extracted') {
          send({
            step: 4,
            status: 'complete',
            itemsCount: result.itemsCount,
            durationMs: result.durationMs,
            tokenCount: result.tokenCount,
          })
        } else {
          send({ status: 'error', error: result.error })
        }
      } catch (error) {
        send({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export const maxDuration = 60

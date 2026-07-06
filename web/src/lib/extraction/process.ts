import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropicClient, EXTRACTION_MODEL } from '@/lib/anthropic'
import { getExtractionConfig } from './prompts'

interface ExtractionResult {
  documentId: string
  status: 'extracted' | 'failed'
  itemsCount: number
  error?: string
  durationMs: number
  tokenCount: number
}

export interface ProcessingCallbacks {
  onPrepare?: () => void
  onExtract?: () => void
  onParse?: () => void
  onStore?: () => void
}

export async function processDocument(
  documentId: string,
  callbacks?: ProcessingCallbacks,
  injectedClient?: SupabaseClient
): Promise<ExtractionResult> {
  const supabase = injectedClient ?? (await (await import('@/lib/supabase/server')).createClient())
  const startTime = Date.now()

  // 1. Fetch the document record
  const { data: doc, error: fetchError } = await supabase
    .from('extraction_documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (fetchError || !doc) {
    return { documentId, status: 'failed', itemsCount: 0, error: 'Document not found', durationMs: 0, tokenCount: 0 }
  }

  // 2. Update status to processing
  await supabase
    .from('extraction_documents')
    .update({ status: 'processing', extraction_started_at: new Date().toISOString() })
    .eq('id', documentId)

  try {
    // 3. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('extraction-documents')
      .download(doc.file_path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }

    callbacks?.onPrepare?.()

    // 4. Get extraction config for this document type
    const config = getExtractionConfig(doc.document_type)

    // 5. Prepare the content for Claude
    const fileBuffer = Buffer.from(await fileData.arrayBuffer())

    const isPdf = doc.mime_type === 'application/pdf'
    const isCsv = doc.mime_type === 'text/csv' || doc.file_name.endsWith('.csv')
    const isExcel = doc.mime_type?.includes('spreadsheet') || doc.mime_type?.includes('excel') ||
      doc.file_name.endsWith('.xlsx') || doc.file_name.endsWith('.xls')

    // Max text content size (~150k chars ≈ ~40k tokens, leaving room for prompt + response)
    const MAX_TEXT_CHARS = 150_000

    // Build message content
    const userContent: Anthropic.Messages.ContentBlockParam[] = []

    if (isPdf) {
      // Check PDF size - if over ~15MB base64, it may be too large
      const base64Content = fileBuffer.toString('base64')
      if (base64Content.length > 20_000_000) {
        throw new Error('PDF file is too large for extraction. Please use a smaller file (under 15MB).')
      }
      userContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Content,
        },
      })
    } else if (isExcel) {
      // Parse Excel to CSV text using xlsx library
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

      let allText = ''
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        allText += `\n=== Sheet: ${sheetName} ===\n${csv}\n`
        // Stop early if we're already at the limit
        if (allText.length > MAX_TEXT_CHARS) break
      }

      if (allText.length > MAX_TEXT_CHARS) {
        allText = allText.slice(0, MAX_TEXT_CHARS) + '\n\n[... truncated due to size ...]'
      }

      userContent.push({
        type: 'text',
        text: `Here is the Excel workbook data (converted to CSV):\n${allText}`,
      })
    } else if (isCsv) {
      let textContent = fileBuffer.toString('utf-8')
      if (textContent.length > MAX_TEXT_CHARS) {
        textContent = textContent.slice(0, MAX_TEXT_CHARS) + '\n\n[... truncated due to size ...]'
      }
      userContent.push({
        type: 'text',
        text: `Here is the CSV/tabular data:\n\n${textContent}`,
      })
    } else {
      let textContent = fileBuffer.toString('utf-8')
      if (textContent.length > MAX_TEXT_CHARS) {
        textContent = textContent.slice(0, MAX_TEXT_CHARS) + '\n\n[... truncated due to size ...]'
      }
      userContent.push({
        type: 'text',
        text: `Here is the document content:\n\n${textContent}`,
      })
    }

    userContent.push({
      type: 'text',
      text: config.userPrompt,
    })

    callbacks?.onExtract?.()

    // 6. Call Claude
    // Questionnaires need much more output tokens since they extract many questions
    // (16k was not enough — responses were getting truncated)
    const isQuestionnaire = doc.document_type === 'questionnaire' || doc.document_type === 'questionnaire_filled'
    const maxTokens = isQuestionnaire ? 64000 : 4096

    const client = getAnthropicClient()

    // Use streaming for large max_tokens to avoid SDK timeout
    const stream = client.messages.stream({
      model: EXTRACTION_MODEL,
      max_tokens: maxTokens,
      system: config.systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      tools: [config.tool],
      tool_choice: { type: 'tool', name: config.tool.name },
    })

    const response = await stream.finalMessage()

    // Check if response was truncated
    if (response.stop_reason === 'max_tokens') {
      console.warn(`[extraction] Response truncated by max_tokens for document ${documentId} (type: ${doc.document_type})`)
    }

    // 7. Parse the tool_use response
    const toolUseBlock = response.content.find(
      (block) => block.type === 'tool_use'
    )

    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      throw new Error('Claude did not return a tool_use response')
    }

    const extractedData = toolUseBlock.input as Record<string, unknown>
    const tokenCount = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    callbacks?.onParse?.()

    // 8. Convert extracted data into extraction_items
    const items: Array<{
      document_id: string
      item_type: string
      data: Record<string, unknown>
      confidence: number
    }> = []

    // Chemicals
    const chemicals = (extractedData.chemicals || extractedData.materials) as Array<Record<string, unknown>> | undefined
    if (chemicals && Array.isArray(chemicals)) {
      for (const chem of chemicals) {
        items.push({
          document_id: documentId,
          item_type: 'chemical',
          data: chem,
          confidence: (chem.confidence as number) ?? 0.8,
        })
      }
    }

    // Hazards
    const hazards = extractedData.hazards as Record<string, unknown> | undefined
    if (hazards && Object.keys(hazards).length > 0) {
      items.push({
        document_id: documentId,
        item_type: 'hazard',
        data: hazards,
        confidence: 0.9,
      })
    }

    // Test results
    const testResults = extractedData.test_results as Array<Record<string, unknown>> | undefined
    if (testResults && Array.isArray(testResults)) {
      for (const result of testResults) {
        items.push({
          document_id: documentId,
          item_type: 'test_result',
          data: result,
          confidence: (result.confidence as number) ?? 0.8,
        })
      }
    }

    // Physical properties
    const physProps = extractedData.physical_properties as Record<string, unknown> | undefined
    if (physProps && Object.keys(physProps).length > 0) {
      items.push({
        document_id: documentId,
        item_type: 'physical_property',
        data: physProps,
        confidence: 0.9,
      })
    }

    // Traceability
    const traceability = (extractedData.traceability || extractedData.batch_info) as Record<string, unknown> | undefined
    if (traceability && Object.keys(traceability).length > 0) {
      items.push({
        document_id: documentId,
        item_type: 'traceability',
        data: traceability,
        confidence: 0.9,
      })
    }

    // Questionnaire questions (reverse ingestion)
    const questions = extractedData.questions as Array<Record<string, unknown>> | undefined
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        items.push({
          document_id: documentId,
          item_type: 'question_requirement',
          data: q,
          confidence: (q.confidence as number) ?? 0.8,
        })
      }
    }

    // Questionnaire metadata (sections, title, regulations)
    if (extractedData.document_title || extractedData.referenced_regulations || extractedData.sections) {
      items.push({
        document_id: documentId,
        item_type: 'questionnaire_metadata',
        data: {
          document_title: extractedData.document_title,
          requesting_organization: extractedData.requesting_organization,
          referenced_regulations: extractedData.referenced_regulations,
          sections: extractedData.sections,
        },
        confidence: 1.0,
      })
    }

    callbacks?.onStore?.()

    console.log(`[extraction] Document ${documentId} (type: ${doc.document_type}): extracted ${items.length} items`, items.map(i => i.item_type))

    // 9. Insert extraction items
    if (items.length > 0) {
      const { error: insertError } = await supabase
        .from('extraction_items')
        .insert(items)

      if (insertError) {
        throw new Error(`Failed to insert extraction items: ${insertError.message}`)
      }
    } else {
      console.warn(`[extraction] Document ${documentId}: no items extracted. Raw keys: ${Object.keys(extractedData).join(', ')}`)
    }

    const durationMs = Date.now() - startTime

    // 10. Update document status
    await supabase
      .from('extraction_documents')
      .update({
        status: 'extracted',
        raw_extraction: extractedData,
        extraction_model: EXTRACTION_MODEL,
        extraction_completed_at: new Date().toISOString(),
        extraction_duration_ms: durationMs,
        extraction_token_count: tokenCount,
        product_name: (extractedData.product_name as string) || doc.product_name,
        supplier_name: (extractedData.manufacturer as string) || doc.supplier_name,
      })
      .eq('id', documentId)

    return {
      documentId,
      status: 'extracted',
      itemsCount: items.length,
      durationMs,
      tokenCount,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update document with failure
    await supabase
      .from('extraction_documents')
      .update({
        status: 'failed',
        extraction_error: errorMessage,
        extraction_completed_at: new Date().toISOString(),
        extraction_duration_ms: durationMs,
      })
      .eq('id', documentId)

    return {
      documentId,
      status: 'failed',
      itemsCount: 0,
      error: errorMessage,
      durationMs,
      tokenCount: 0,
    }
  }
}

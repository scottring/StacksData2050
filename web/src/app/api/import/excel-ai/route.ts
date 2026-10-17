import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EXCEL_RESPONSE_MODEL } from '@/lib/anthropic'
import {
  isStandardHqWorkbook,
  workbookToCellText,
  loadSheetQuestions,
  mapWorkbookWithClaude,
  validateMapping,
  PRESELECT_CONFIDENCE,
} from '@/lib/import/response-mapper'

// Mapping runs a few parallel Claude requests; large replies take a minute or two.
export const maxDuration = 300

const MAX_FILE_BYTES = 15 * 1024 * 1024

/**
 * POST /api/import/excel-ai
 *
 * Form data: file (xlsx/xls), sheetId, force ("1" maps with AI even when the
 * workbook looks like the standard HQ 2.1 layout).
 *
 * Returns { standardWorkbook: true } for standard workbooks so the caller can
 * use the deterministic importer, otherwise a preview of AI-mapped answers.
 * Nothing is written here; accepted answers go through /api/import/execute.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sheetId = String(formData.get('sheetId') ?? '')
    const force = formData.get('force') === '1'

    if (!file || !sheetId) {
      return NextResponse.json({ error: 'A file and sheetId are required' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File is larger than 15 MB' }, { status: 400 })
    }

    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, company_id, requesting_company_id')
      .eq('id', sheetId)
      .single()
    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
    }
    if (!profile?.company_id || (sheet.company_id !== profile.company_id && sheet.requesting_company_id !== profile.company_id)) {
      return NextResponse.json({ error: 'You do not have access to this sheet' }, { status: 403 })
    }

    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' })
    } catch {
      return NextResponse.json({ error: 'Could not read this file as an Excel workbook' }, { status: 400 })
    }

    if (!force && isStandardHqWorkbook(workbook)) {
      return NextResponse.json({ standardWorkbook: true })
    }

    const questions = await loadSheetQuestions(supabase, createAdminClient(), sheetId)
    if (questions.length === 0) {
      return NextResponse.json({ error: 'This sheet has no questions to map to. Check its tags.' }, { status: 400 })
    }

    const workbookText = workbookToCellText(workbook)
    if (workbookText.includedCells === 0) {
      return NextResponse.json({ error: 'No readable cells were found in this workbook' }, { status: 400 })
    }

    const raw = await mapWorkbookWithClaude(workbookText.text, questions)
    const mapping = validateMapping(raw, questions)

    const warnings: string[] = []
    if (workbookText.truncated) {
      warnings.push(
        `This workbook is large. Only ${workbookText.includedCells.toLocaleString()} of ${workbookText.totalCells.toLocaleString()} filled cells were read, so answers in the rest were not mapped.`,
      )
    }
    if (workbookText.skippedSheets.length) {
      warnings.push(`Not read: ${workbookText.skippedSheets.join(', ')}.`)
    }
    warnings.push(...raw.warnings)
    if (mapping.rejected.length) {
      warnings.push(`${mapping.rejected.length} AI suggestion(s) were discarded because they did not match this sheet's questions.`)
    }

    if (mapping.answers.length === 0 && mapping.tables.length === 0 && raw.warnings.length) {
      return NextResponse.json({ error: raw.warnings.join(' ') }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sheetId,
      companyId: sheet.company_id,
      model: EXCEL_RESPONSE_MODEL,
      questionCount: questions.length,
      preselectConfidence: PRESELECT_CONFIDENCE,
      answers: mapping.answers,
      tables: mapping.tables,
      rejected: mapping.rejected,
      warnings,
      stats: {
        cellsRead: workbookText.includedCells,
        totalCells: workbookText.totalCells,
        inputTokens: raw.usage.inputTokens,
        outputTokens: raw.usage.outputTokens,
      },
    })
  } catch (error: any) {
    console.error('AI Excel import error:', error)
    return NextResponse.json({ error: error.message || 'Failed to map Excel file' }, { status: 500 })
  }
}

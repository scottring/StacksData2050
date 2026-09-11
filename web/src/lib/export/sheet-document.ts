import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Builds the complete, human-readable content of a sheet for document
 * export (PDF). Mirrors what the sheet editor shows: the sheet's tagged
 * questions grouped by section/subsection, the same display numbering
 * (dependent questions get sub-numbers like 5.1.3.1 and are hidden unless
 * their parent was answered Yes), list-table rows, the customer's custom
 * questions, and attachment file names.
 */

export interface SheetDocumentQuestion {
  number: string
  text: string
  responseType: string
  answer: string | null
  additionalNotes: string | null
  table: { columns: string[]; rows: string[][] } | null
  attachments: string[]
}

export interface SheetDocumentSubsection {
  number: string
  name: string
  questions: SheetDocumentQuestion[]
}

export interface SheetDocumentSection {
  number: number
  name: string
  subsections: SheetDocumentSubsection[]
}

export interface SheetDocumentCustomQuestion {
  text: string
  answer: string | null
}

export interface SheetDocument {
  sheet: { id: string; name: string; status: string; version: number; modifiedAt: string | null; submittedAt: string | null }
  supplier: string
  customer: string | null
  tags: string[]
  sections: SheetDocumentSection[]
  customQuestions: SheetDocumentCustomQuestion[]
  generatedAt: string
}

interface RawAnswer {
  id: string
  question_id: string
  text_value: string | null
  text_area_value: string | null
  number_value: number | null
  boolean_value: boolean | null
  date_value: string | null
  choice_content: string | null
  additional_notes: string | null
  list_table_row_id: string | null
  list_table_column_id: string | null
  list_table_column_name: string | null
  list_table_column_order: number | null
  created_at: string | null
}

function answerText(a: RawAnswer): string {
  if (a.choice_content) return a.choice_content
  if (a.text_value) return a.text_value
  if (a.text_area_value) return a.text_area_value
  if (a.number_value !== null && a.number_value !== undefined) return String(a.number_value)
  if (a.boolean_value !== null && a.boolean_value !== undefined) return a.boolean_value ? 'Yes' : 'No'
  if (a.date_value) return a.date_value
  return ''
}

function isListTableType(responseType: string | null | undefined): boolean {
  const rt = (responseType || '').toLowerCase()
  return rt === 'list table' || rt === 'list_table' || rt === 'pidsl list'
}

export async function getSheetDocument(
  supabase: SupabaseClient,
  sheetId: string
): Promise<SheetDocument | null> {
  const { data: sheet } = await supabase
    .from('sheets')
    .select(`
      id, name, status, version, modified_at, submitted_at,
      supplier:companies!sheets_company_id_fkey(name),
      customer:companies!sheets_requesting_company_id_fkey(name)
    `)
    .eq('id', sheetId)
    .single()
  if (!sheet) return null

  const rel = (r: unknown): { name?: string } | null => (Array.isArray(r) ? r[0] : r) as { name?: string } | null

  // Tags -> questions
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)
  const tagIds = (sheetTags || []).map(t => t.tag_id)
  const tagNames = (sheetTags || []).map(t => rel(t.tags)?.name).filter(Boolean) as string[]

  let questionIds: string[] = []
  if (tagIds.length > 0) {
    const { data: qt } = await supabase.from('question_tags').select('question_id').in('tag_id', tagIds)
    questionIds = [...new Set((qt || []).map(x => x.question_id))]
  }

  const questions: any[] = []
  for (let i = 0; i < questionIds.length; i += 50) {
    const batch = questionIds.slice(i, i + 50)
    const { data } = await supabase
      .from('questions')
      .select(`
        id, name, content, response_type, order_number, dependent_no_show, subsection_id,
        subsections!questions_subsection_id_fkey(id, name, order_number, sections(id, name, order_number))
      `)
      .in('id', batch)
    if (data) questions.push(...data)
  }

  // Answers (view includes choice text and list-table column names)
  const { data: answersRaw } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId)
  const answers = (answersRaw || []) as RawAnswer[]

  // Columns for list-table questions (so empty tables still show headers,
  // and column order is stable)
  const { data: columns } = await supabase
    .from('list_table_columns')
    .select('id, name, order_number, question_id')
    .in('question_id', questionIds.length > 0 ? questionIds : ['none'])
    .order('order_number')

  // Attachments
  const { data: attachments } = await supabase
    .from('question_attachments')
    .select('question_id, file_name')
    .eq('sheet_id', sheetId)
    .order('created_at')

  // Sort questions as the editor does, and compute display numbers
  const withSort = questions.map(q => {
    const sub = q.subsections
    const sec = sub?.sections
    return {
      ...q,
      _sectionSort: sec?.order_number ?? 999,
      _subsectionSort: sub?.order_number ?? 999,
      _order: q.order_number ?? 999,
      _sectionName: sec?.name || '',
      _subsectionName: sub?.name || '',
    }
  })
  withSort.sort((a, b) =>
    a._sectionSort - b._sectionSort || a._subsectionSort - b._subsectionSort || a._order - b._order
  )

  // Branching: a dependent question's parent is the previous non-dependent
  // question in the same subsection
  const parentOf = new Map<string, string>()
  const bySubsection = new Map<string, any[]>()
  withSort.forEach(q => {
    const key = q.subsection_id || 'none'
    if (!bySubsection.has(key)) bySubsection.set(key, [])
    bySubsection.get(key)!.push(q)
  })
  bySubsection.forEach(list => {
    let lastParent: string | null = null
    list.forEach(q => {
      if (q.dependent_no_show) {
        if (lastParent) parentOf.set(q.id, lastParent)
      } else {
        lastParent = q.id
      }
    })
  })

  const numbers = new Map<string, string>()
  const subsectionCounter = new Map<string, number>()
  const dependentCounter = new Map<string, number>()
  withSort.forEach(q => {
    const parent = parentOf.get(q.id)
    if (parent) {
      const parentNumber = numbers.get(parent)
      if (parentNumber) {
        const n = (dependentCounter.get(parent) || 0) + 1
        dependentCounter.set(parent, n)
        numbers.set(q.id, `${parentNumber}.${n}`)
      }
    } else {
      const key = `${q._sectionSort}.${q._subsectionSort}`
      const n = (subsectionCounter.get(key) || 0) + 1
      subsectionCounter.set(key, n)
      numbers.set(q.id, `${key}.${n}`)
    }
  })

  // Group answers per question
  const answersByQuestion = new Map<string, RawAnswer[]>()
  answers.forEach(a => {
    if (!answersByQuestion.has(a.question_id)) answersByQuestion.set(a.question_id, [])
    answersByQuestion.get(a.question_id)!.push(a)
  })
  const singleAnswer = (qid: string): RawAnswer | undefined =>
    (answersByQuestion.get(qid) || []).find(a => !a.list_table_row_id)

  const isVisible = (q: any): boolean => {
    const parent = parentOf.get(q.id)
    if (!parent) return true
    const pa = singleAnswer(parent)
    const v = pa ? answerText(pa).toLowerCase() : ''
    return v === 'yes' || v === 'true'
  }

  const attachmentsByQuestion = new Map<string, string[]>()
  ;(attachments || []).forEach(a => {
    if (!attachmentsByQuestion.has(a.question_id)) attachmentsByQuestion.set(a.question_id, [])
    attachmentsByQuestion.get(a.question_id)!.push(a.file_name)
  })

  const buildTable = (q: any): SheetDocumentQuestion['table'] => {
    const rowsAnswers = (answersByQuestion.get(q.id) || []).filter(a => a.list_table_row_id && a.list_table_column_id)
    const dbCols = (columns || []).filter(c => c.question_id === q.id)
    let cols: { id: string; name: string }[]
    if (dbCols.length > 0) {
      cols = dbCols.map(c => ({ id: c.id, name: c.name || 'Column' }))
    } else {
      const seen = new Map<string, { name: string; order: number }>()
      rowsAnswers.forEach(a => {
        if (!seen.has(a.list_table_column_id!)) {
          seen.set(a.list_table_column_id!, { name: a.list_table_column_name || 'Column', order: a.list_table_column_order || 0 })
        }
      })
      cols = [...seen.entries()].sort((a, b) => a[1].order - b[1].order).map(([id, c]) => ({ id, name: c.name }))
    }
    if (cols.length === 0) return null

    const rowMap = new Map<string, Map<string, string>>()
    rowsAnswers.forEach(a => {
      if (!rowMap.has(a.list_table_row_id!)) rowMap.set(a.list_table_row_id!, new Map())
      rowMap.get(a.list_table_row_id!)!.set(a.list_table_column_id!, answerText(a))
    })
    const rows = [...rowMap.values()].map(cells => cols.map(c => cells.get(c.id) || ''))
    return { columns: cols.map(c => c.name), rows }
  }

  // Assemble sections
  const sections: SheetDocumentSection[] = []
  const sectionIndex = new Map<number, SheetDocumentSection>()
  withSort.forEach(q => {
    if (!isVisible(q)) return
    if (!sectionIndex.has(q._sectionSort)) {
      const s: SheetDocumentSection = { number: q._sectionSort, name: q._sectionName, subsections: [] }
      sectionIndex.set(q._sectionSort, s)
      sections.push(s)
    }
    const section = sectionIndex.get(q._sectionSort)!
    const subNumber = `${q._sectionSort}.${q._subsectionSort}`
    let sub = section.subsections.find(s => s.number === subNumber)
    if (!sub) {
      sub = { number: subNumber, name: q._subsectionName, questions: [] }
      section.subsections.push(sub)
    }

    const listTable = isListTableType(q.response_type)
    const sa = singleAnswer(q.id)
    sub.questions.push({
      number: numbers.get(q.id) || subNumber,
      text: q.name || q.content || '',
      responseType: q.response_type || 'text',
      answer: listTable ? null : (sa ? answerText(sa) || null : null),
      additionalNotes: sa?.additional_notes || null,
      table: listTable ? buildTable(q) : null,
      attachments: attachmentsByQuestion.get(q.id) || [],
    })
  })

  // Custom questions from the request
  const customQuestions: SheetDocumentCustomQuestion[] = []
  const { data: request } = await supabase.from('requests').select('id').eq('sheet_id', sheetId).maybeSingle()
  if (request) {
    const { data: rcq } = await supabase
      .from('request_custom_questions')
      .select('sort_order, company_question_id, company_questions(question_text)')
      .eq('request_id', request.id)
      .order('sort_order')
    const { data: ca } = await supabase
      .from('custom_question_answers')
      .select('company_question_id, value')
      .eq('sheet_id', sheetId)
    const caMap = new Map((ca || []).map(a => [a.company_question_id, a.value]))
    ;(rcq || []).forEach(r => {
      const cq = rel(r.company_questions) as { question_text?: string } | null
      if (!cq) return
      customQuestions.push({ text: cq.question_text || '', answer: caMap.get(r.company_question_id) ?? null })
    })
  }

  return {
    sheet: {
      id: sheet.id,
      name: sheet.name || 'Untitled sheet',
      status: sheet.status || 'draft',
      version: sheet.version || 1,
      modifiedAt: sheet.modified_at,
      submittedAt: sheet.submitted_at,
    },
    supplier: rel(sheet.supplier)?.name || 'Unknown',
    customer: rel(sheet.customer)?.name || null,
    tags: tagNames,
    sections,
    customQuestions,
    generatedAt: new Date().toISOString(),
  }
}

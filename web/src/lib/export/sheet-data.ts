import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Helper to extract a field from Supabase relationship which may be object or array
 */
function getRelationField<T>(relation: unknown, field: keyof T): T[keyof T] | undefined {
  if (!relation) return undefined
  if (Array.isArray(relation)) {
    return (relation[0] as T)?.[field]
  }
  return (relation as T)[field]
}

export interface SheetExportData {
  sheet: {
    id: string
    name: string
    status: string
    version: number
    created_at: string
    modified_at: string
  }
  supplier: {
    id: string
    name: string
  }
  customer: {
    id: string
    name: string
  } | null
  tags: string[]
  sections: SectionData[]
  listTables: ListTableData[]
}

export interface SectionData {
  section_number: number
  section_name: string
  subsections: SubsectionData[]
}

export interface SubsectionData {
  subsection_number: number
  subsection_name: string
  questions: QuestionData[]
}

export interface QuestionData {
  question_number: string // e.g., "4.8.1"
  content: string
  response_type: string
  answer: string | null
  answer_raw: any
}

export interface ListTableData {
  name: string
  columns: string[]
  rows: Record<string, string>[]
}

/**
 * Fetches complete sheet data for export, including all questions and answers
 */
export async function getSheetExportData(
  supabase: SupabaseClient,
  sheetId: string
): Promise<SheetExportData | null> {
  // Fetch sheet with company info
  const { data: sheet, error: sheetError } = await supabase
    .from('sheets')
    .select(`
      id,
      name,
      status,
      version,
      created_at,
      modified_at,
      supplier:companies!sheets_company_id_fkey(id, name),
      customer:companies!sheets_requesting_company_id_fkey(id, name)
    `)
    .eq('id', sheetId)
    .single()

  if (sheetError || !sheet) {
    console.error('Failed to fetch sheet:', sheetError)
    return null
  }

  // Fetch tags for this sheet
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  const tagIds = sheetTags?.map(st => st.tag_id) || []
  const tagNames = sheetTags?.map(st =>
    getRelationField<{ name: string }>(st.tags, 'name')
  ).filter(Boolean) as string[] || []

  // Get question IDs for these tags
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds.length > 0 ? tagIds : ['none'])

  const questionIds = questionTags?.map(qt => qt.question_id) || []

  // Fetch questions with sections/subsections
  const { data: questions } = await supabase
    .from('questions')
    .select(`
      id,
      content,
      response_type,
      question_type,
      section_sort_number,
      subsection_sort_number,
      order_number,
      sections:parent_section_id(id, name, order_number),
      subsections:parent_subsection_id(id, name, order_number),
      list_table_id
    `)
    .in('id', questionIds.length > 0 ? questionIds : ['none'])
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  // Fetch all answers for this sheet
  const { data: answers } = await supabase
    .from('answers')
    .select(`
      id,
      parent_question_id,
      originating_question_id,
      text_value,
      text_area_value,
      number_value,
      boolean_value,
      date_value,
      choice_id,
      choices:choice_id(content),
      list_table_row_id,
      list_table_column_id
    `)
    .eq('sheet_id', sheetId)

  // Create answer lookup by question ID
  const answerMap = new Map<string, any>()
  for (const answer of answers || []) {
    const qId = answer.parent_question_id || answer.originating_question_id
    if (qId && !answer.list_table_row_id) {
      answerMap.set(qId, answer)
    }
  }

  // Organize questions into sections/subsections
  const sectionMap = new Map<number, SectionData>()

  for (const q of questions || []) {
    const sectionNum = q.section_sort_number || 0
    const subsectionNum = q.subsection_sort_number || 0
    const questionNum = `${sectionNum}.${subsectionNum}.${q.order_number || 0}`

    if (!sectionMap.has(sectionNum)) {
      sectionMap.set(sectionNum, {
        section_number: sectionNum,
        section_name: getRelationField<{ name: string }>(q.sections, 'name') || `Section ${sectionNum}`,
        subsections: []
      })
    }

    const section = sectionMap.get(sectionNum)!
    let subsection = section.subsections.find(s => s.subsection_number === subsectionNum)
    if (!subsection) {
      subsection = {
        subsection_number: subsectionNum,
        subsection_name: getRelationField<{ name: string }>(q.subsections, 'name') || `Subsection ${subsectionNum}`,
        questions: []
      }
      section.subsections.push(subsection)
    }

    // Get answer value
    const answer = answerMap.get(q.id)
    let answerValue: string | null = null
    if (answer) {
      if (answer.text_value) answerValue = answer.text_value
      else if (answer.text_area_value) answerValue = answer.text_area_value
      else if (answer.number_value !== null) answerValue = String(answer.number_value)
      else if (answer.boolean_value !== null) answerValue = answer.boolean_value ? 'Yes' : 'No'
      else if (answer.date_value) answerValue = answer.date_value
      else if (answer.choice_id && answer.choices) answerValue = getRelationField<{ content: string }>(answer.choices, 'content') || ''
    }

    subsection.questions.push({
      question_number: questionNum,
      content: q.content || '',
      response_type: q.response_type || q.question_type || 'text',
      answer: answerValue,
      answer_raw: answer
    })
  }

  // Sort subsections within each section
  sectionMap.forEach(section => {
    section.subsections.sort((a, b) => a.subsection_number - b.subsection_number)
  })

  // Handle list tables
  const listTableIds = [...new Set((questions || []).map(q => q.list_table_id).filter(Boolean))]
  const listTables: ListTableData[] = []

  if (listTableIds.length > 0) {
    // Fetch list table columns
    const { data: columns } = await supabase
      .from('list_table_columns')
      .select('id, name, parent_table_id, order_number')
      .in('parent_table_id', listTableIds)
      .order('order_number')

    // Fetch list table rows with answers
    const listTableAnswers = (answers || []).filter(a => a.list_table_row_id)

    // Group by table
    for (const tableId of listTableIds) {
      const tableCols = (columns || []).filter(c => c.parent_table_id === tableId)
      const tableAnswers = listTableAnswers.filter(a => {
        const col = tableCols.find(c => c.id === a.list_table_column_id)
        return col !== undefined
      })

      // Get unique row IDs
      const rowIds = [...new Set(tableAnswers.map(a => a.list_table_row_id))]

      const rows: Record<string, string>[] = []
      for (const rowId of rowIds) {
        const row: Record<string, string> = {}
        for (const col of tableCols) {
          const cellAnswer = tableAnswers.find(
            a => a.list_table_row_id === rowId && a.list_table_column_id === col.id
          )
          if (cellAnswer) {
            if (cellAnswer.text_value) row[col.name] = cellAnswer.text_value
            else if (cellAnswer.number_value !== null) row[col.name] = String(cellAnswer.number_value)
            else if (cellAnswer.choice_id && cellAnswer.choices) {
              row[col.name] = getRelationField<{ content: string }>(cellAnswer.choices, 'content') || ''
            }
            else row[col.name] = ''
          } else {
            row[col.name] = ''
          }
        }
        rows.push(row)
      }

      if (tableCols.length > 0) {
        listTables.push({
          name: `List Table`,
          columns: tableCols.map(c => c.name),
          rows
        })
      }
    }
  }

  return {
    sheet: {
      id: sheet.id,
      name: sheet.name || 'Untitled Sheet',
      status: sheet.status || 'draft',
      version: sheet.version || 1,
      created_at: sheet.created_at,
      modified_at: sheet.modified_at
    },
    supplier: {
      id: getRelationField<{ id: string; name: string }>(sheet.supplier, 'id') || '',
      name: getRelationField<{ id: string; name: string }>(sheet.supplier, 'name') || 'Unknown'
    },
    customer: sheet.customer ? {
      id: getRelationField<{ id: string; name: string }>(sheet.customer, 'id') || '',
      name: getRelationField<{ id: string; name: string }>(sheet.customer, 'name') || ''
    } : null,
    tags: tagNames,
    sections: Array.from(sectionMap.values()).sort((a, b) => a.section_number - b.section_number),
    listTables
  }
}

/**
 * Verifies that the user/company has access to the specified sheets
 */
export async function verifySheetAccess(
  supabase: SupabaseClient,
  sheetIds: string[],
  companyId: string
): Promise<string[]> {
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id')
    .in('id', sheetIds)
    .or(`company_id.eq.${companyId},requesting_company_id.eq.${companyId}`)

  return sheets?.map(s => s.id) || []
}

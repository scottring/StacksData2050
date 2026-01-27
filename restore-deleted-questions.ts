import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fetch from 'node-fetch'
import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

const EXCEL_PATH = '/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx'

async function parseExcelIds(): Promise<Set<string>> {
  const zip = new AdmZip(EXCEL_PATH)

  const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml')
  let sharedStrings: string[] = []
  if (sharedStringsEntry) {
    const sharedStringsXml = sharedStringsEntry.getData().toString('utf8')
    const parsed = await parseStringPromise(sharedStringsXml)
    if (parsed.sst && parsed.sst.si) {
      sharedStrings = parsed.sst.si.map((si: any) => {
        if (si.t) return si.t[0]
        if (si.r) return si.r.map((r: any) => r.t ? r.t[0] : '').join('')
        return ''
      })
    }
  }

  const workbookEntry = zip.getEntry('xl/workbook.xml')
  if (!workbookEntry) throw new Error('No workbook.xml found')
  const workbookXml = workbookEntry.getData().toString('utf8')
  const workbook = await parseStringPromise(workbookXml)

  const sheets = workbook.workbook.sheets[0].sheet
  let stacksTabIndex = -1
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].$.name === 'STACKS TAB 2023') {
      stacksTabIndex = i + 1
      break
    }
  }

  if (stacksTabIndex === -1) throw new Error('STACKS TAB 2023 not found')

  const sheetEntry = zip.getEntry(`xl/worksheets/sheet${stacksTabIndex}.xml`)
  if (!sheetEntry) throw new Error(`Sheet ${stacksTabIndex} not found`)
  const sheetXml = sheetEntry.getData().toString('utf8')
  const sheet = await parseStringPromise(sheetXml)

  const ids = new Set<string>()
  const sheetData = sheet.worksheet.sheetData[0].row

  const getCellValue = (cell: any): string => {
    if (!cell || !cell.v) return ''
    const value = cell.v[0]
    if (cell.$.t === 's') {
      return sharedStrings[parseInt(value)] || ''
    }
    return value.toString()
  }

  const getColumnIndex = (ref: string): number => {
    const match = ref.match(/^([A-Z]+)/)
    if (!match) return -1
    const col = match[1]
    let index = 0
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 64)
    }
    return index - 1
  }

  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i]
    if (!row.c) continue

    for (const cell of row.c) {
      const colIndex = getColumnIndex(cell.$.r)
      if (colIndex === 0) {
        const id = getCellValue(cell)
        if (id) ids.add(id)
      }
    }
  }

  return ids
}

async function fetchFromBubble(bubbleId: string): Promise<any> {
  const url = `${BUBBLE_API_URL}/api/1.1/obj/question?constraints=[{"key":"_id","constraint_type":"equals","value":"${bubbleId}"}]`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  })

  if (!response.ok) {
    throw new Error(`Bubble API error: ${response.status}`)
  }

  const data = await response.json() as any
  return data.response?.results?.[0]
}

async function restore() {
  console.log('=== RESTORE DELETED QUESTIONS ===\n')

  // Get all Excel IDs
  console.log('Parsing Excel IDs...')
  const excelIds = await parseExcelIds()
  console.log(`Found ${excelIds.size} unique Excel IDs\n`)

  // Get current Supabase bubble_ids
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, name')

  const supabaseBubbleIds = new Set(
    (questions || [])
      .filter(q => q.bubble_id)
      .map(q => q.bubble_id)
  )

  console.log(`Current Supabase questions: ${questions?.length}`)
  console.log(`Questions with bubble_id: ${supabaseBubbleIds.size}\n`)

  // Find Excel IDs that are NOT in Supabase
  const missingIds: string[] = []
  for (const id of excelIds) {
    if (!supabaseBubbleIds.has(id)) {
      missingIds.push(id)
    }
  }

  console.log(`Missing from Supabase (were in Excel): ${missingIds.length}\n`)

  if (missingIds.length === 0) {
    console.log('No missing questions to restore!')
    return
  }

  // Fetch each missing question from Bubble
  console.log('Fetching missing questions from Bubble...\n')

  const toRestore: any[] = []
  for (const bubbleId of missingIds) {
    try {
      const bubbleQuestion = await fetchFromBubble(bubbleId)
      if (bubbleQuestion) {
        toRestore.push({
          bubbleId,
          bubbleData: bubbleQuestion
        })
        console.log(`  Found: ${bubbleQuestion.Question?.substring(0, 50) || bubbleQuestion.name?.substring(0, 50) || '(no text)'}...`)
      } else {
        console.log(`  NOT FOUND in Bubble: ${bubbleId}`)
      }
    } catch (err: any) {
      console.log(`  ERROR fetching ${bubbleId}: ${err.message}`)
    }
  }

  console.log(`\nFound ${toRestore.length} questions in Bubble to restore\n`)

  if (toRestore.length === 0) {
    console.log('Nothing to restore from Bubble.')
    return
  }

  // Get ID mappings for sections/subsections
  const { data: sectionMappings } = await supabase
    .from('_migration_id_map')
    .select('bubble_id, supabase_id')
    .eq('entity_type', 'section')

  const { data: subsectionMappings } = await supabase
    .from('_migration_id_map')
    .select('bubble_id, supabase_id')
    .eq('entity_type', 'subsection')

  const sectionMap = new Map((sectionMappings || []).map(m => [m.bubble_id, m.supabase_id]))
  const subsectionMap = new Map((subsectionMappings || []).map(m => [m.bubble_id, m.supabase_id]))

  // Insert questions
  console.log('Restoring questions to Supabase...\n')

  let restoredCount = 0
  for (const item of toRestore) {
    const b = item.bubbleData

    // Map section and subsection IDs
    const parentSectionId = b['Parent section'] ? sectionMap.get(b['Parent section']) : null
    const parentSubsectionId = b['Parent subsection'] ? subsectionMap.get(b['Parent subsection']) : null

    const questionData = {
      bubble_id: item.bubbleId,
      name: b.Question || b.name || null,
      content: b.content || null,
      question_description: b['Question Description'] || null,
      clarification: b.Clarification || null,
      clarification_yes_no: b['Clarification yes/no'] || false,
      static_text: b['Static text'] || null,
      a_q_help: b['a-q help'] || null,
      question_type: b['Question type'] || null,
      question_id_number: b['Question ID Number'] || null,
      order_number: b.Order || null,
      required: b.Required || false,
      optional_question: b['Optional question'] || false,
      dependent_no_show: b['Dependent no show'] || false,
      lock: b.Lock || false,
      highlight: b.Highlight || false,
      support_file_requested: b['Support file requested'] || false,
      support_file_reason: b['Support file reason'] || null,
      section_name_sort: b['Section name-sort'] || null,
      section_sort_number: b['Section sort number'] || null,
      subsection_name_sort: b['Subsection name-sort'] || null,
      subsection_sort_number: b['Subsection sort number'] || null,
      parent_section_id: parentSectionId,
      parent_subsection_id: parentSubsectionId,
      created_at: b['Created Date'] || new Date().toISOString(),
      modified_at: b['Modified Date'] || new Date().toISOString()
    }

    const { error } = await supabase
      .from('questions')
      .insert(questionData)

    if (error) {
      console.log(`  ERROR inserting ${item.bubbleId}: ${error.message}`)
    } else {
      restoredCount++
      console.log(`  Restored: ${questionData.name?.substring(0, 50) || '(no name)'}...`)
    }
  }

  console.log(`\n=== RESTORATION COMPLETE ===`)
  console.log(`Restored ${restoredCount} questions`)

  // Final count
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  console.log(`Final question count: ${count}`)
}

restore().catch(console.error)

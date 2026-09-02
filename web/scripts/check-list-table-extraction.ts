/**
 * Exercise the list-table extractor against a real HQ workbook and report
 * what it would import. No database writes.
 *
 *   cd stacks/web
 *   npx tsx scripts/check-list-table-extraction.ts [path/to/workbook.xlsx]
 *
 * Defaults to the calibration fixture. Questions and columns are read from
 * the linked Supabase project through the CLI so the check reflects the real
 * question set.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { execFileSync } from 'child_process'
import * as XLSX from 'xlsx'
import {
  extractListTables,
  matchColumns,
  type DbQuestion,
  type DbListTableColumn,
  type CellLookupEntry,
} from '../src/lib/import/list-tables'

const STACKS_DIR = join(__dirname, '../..')

function query<T>(sql: string): T[] {
  const raw = execFileSync('npx', ['supabase', 'db', 'query', '--linked', sql.replace(/\s+/g, ' ').trim()], {
    cwd: STACKS_DIR,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  const start = raw.indexOf('{')
  const parsed = JSON.parse(raw.slice(start))
  if (parsed._tag === 'Error') throw new Error(JSON.stringify(parsed.error))
  return parsed.rows as T[]
}

function main() {
  const path = process.argv[2] ?? join(__dirname, '../calibration/questionnaire-fixture.xlsx')
  const workbook = XLSX.read(readFileSync(path), { type: 'buffer' })
  const cellLookup = JSON.parse(readFileSync(join(__dirname, '../src/data/excel-cell-lookup.json'), 'utf8')) as Record<string, CellLookupEntry>

  const questions = query<DbQuestion>(`
    select q.id, q.bubble_id, q.response_type, q.content, sec.name as section,
           q.section_sort_number, q.subsection_sort_number, q.order_number
    from questions q
    left join subsections sub on sub.id = q.subsection_id
    left join sections sec on sec.id = sub.section_id
    order by q.section_sort_number, q.subsection_sort_number, q.order_number
  `)
  const columns = query<DbListTableColumn>(`select id, question_id, name, order_number from list_table_columns`)
  const columnsByQuestion = new Map<string, DbListTableColumn[]>()
  for (const c of columns) {
    if (!c.question_id) continue
    columnsByQuestion.set(c.question_id, [...(columnsByQuestion.get(c.question_id) ?? []), c])
  }

  const { resolved, unresolved } = extractListTables(workbook, questions, cellLookup)
  const tableQuestions = questions.filter((q) => (q.response_type ?? '').toLowerCase() === 'list table')

  console.log(`Workbook: ${path}`)
  console.log(`List-table questions in DB: ${tableQuestions.length}; resolved ${resolved.length}, unresolved ${unresolved.length}\n`)

  let matched = 0, toCreate = 0, cells = 0
  for (const t of resolved) {
    const dbCols = columnsByQuestion.get(t.questionId) ?? []
    const match = matchColumns(t.headers, dbCols)
    const missing = match.filter((m) => !m.columnId)
    matched += match.length - missing.length
    toCreate += missing.length
    const cellCount = t.rows.reduce((n, r) => n + Object.keys(r).length, 0)
    cells += cellCount
    const flag = t.rows.length ? `  <- ${t.rows.length} rows, ${cellCount} cells` : ''
    console.log(`${t.sheetName.padEnd(24)} r${String(t.headerRow).padEnd(4)} ${t.questionContent.slice(0, 46).padEnd(48)} cols ${match.length - missing.length}/${match.length}${dbCols.length ? '' : ' (no DB cols)'}${flag}`)
    for (const m of missing) console.log(`      + would create column "${m.headerText.replace(/\s+/g, ' ')}"`)
  }
  for (const u of unresolved) console.log(`UNRESOLVED ${u.sheetName}: ${u.questionContent.slice(0, 50)}  (${u.reason})`)

  console.log(`\nHeaders matched to existing columns: ${matched}; columns to create: ${toCreate}; data cells found: ${cells}`)

  const withData = resolved.filter((t) => t.rows.length)
  if (withData.length) {
    console.log('\nSample of extracted data:')
    for (const t of withData.slice(0, 2)) {
      console.log(`  ${t.sheetName} r${t.headerRow}: ${t.questionContent.slice(0, 50)}`)
      console.log(`    headers: ${t.headers.map((h) => `${h.excelCol}=${h.text.replace(/\s+/g, ' ').slice(0, 18)}`).join(' | ')}`)
      for (const row of t.rows.slice(0, 3)) console.log(`    ${JSON.stringify(row)}`)
    }
  }
}

main()

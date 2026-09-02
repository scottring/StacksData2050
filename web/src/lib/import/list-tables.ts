/**
 * List-table extraction for HQ 2.x Excel workbooks.
 *
 * A list-table question (Food Contact substance lists, Biocides, Additional
 * Requirements) is laid out in the workbook as:
 *
 *   row R      column B: the question text        columns D..L: column headers
 *   rows R+1.. up to MAX_TABLE_ROWS data rows
 *   then       a "Note:" row or the next question
 *
 * The single-cell formula map has no location for these (it maps one cell per
 * question), so tables are located from the workbook itself, anchored on the
 * gate questions around them:
 *
 *   1. Detect header rows: a row with text in column B and at least two
 *      column-header-looking cells in D..L.
 *   2. For each list-table question in DB order, take the window between the
 *      nearest preceding and following questions that DO have a mapped cell
 *      on the same sheet. The table's header row must fall inside that window.
 *   3. Among unused header rows in the window, prefer the one whose column-B
 *      text best overlaps the question text.
 *
 * Question texts repeat verbatim across many tables ("If yes, please give all
 * relevant restrictions:"), so the window is what disambiguates; the text
 * overlap is only a tie-break. A question with no header row in its window is
 * reported as unresolved rather than assigned the next table's row.
 *
 * Column headers are matched to list_table_columns by a canonical form that
 * strips qualifiers like "if any" and folds known synonyms. A header that
 * matches nothing is returned as such so the caller can create the column
 * rather than silently drop the supplier's data.
 */

import type { WorkBook, WorkSheet } from 'xlsx'
import { utils as xlsxUtils } from 'xlsx'

export const MAX_TABLE_ROWS = 15

/** First and last workbook columns that may hold table headers/cells (D..L). */
const FIRST_TABLE_COL = 3 // 0-based: D
const LAST_TABLE_COL = 11 // 0-based: L
const QUESTION_TEXT_COL = 1 // 0-based: B

/** Words that identify a cell as a table column header. */
const HEADER_VOCABULARY = [
  'cas', 'chemical', 'substance', 'concentration', 'conc.', 'comments', 'citation',
  'restriction', 'sml', 'fcm', 'fca', 'e no', 'limit', 'unit', 'name', 'number', 'group',
]

const STOP_WORDS = new Set([
  'the', 'and', 'any', 'please', 'yes', 'for', 'with', 'all', 'give', 'provide', 'details',
  'relevant', 'if', 'of', 'in', 'on', 'or', 'per', 'to', 'a', 'are', 'is', 'be', 'by', 'as',
  'no', 'not', 'following',
])

export interface DbQuestion {
  id: string
  bubble_id: string | null
  response_type: string | null
  content: string | null
  section: string | null
  section_sort_number: number | null
  subsection_sort_number: number | null
  order_number: number | null
}

export interface CellLookupEntry {
  sheet: string
  cell: string
}

export interface TableHeader {
  /** Workbook column letter, e.g. "D". */
  excelCol: string
  /** Header text as written in the workbook. */
  text: string
}

export interface ResolvedTable {
  questionId: string
  questionContent: string
  sheetName: string
  headerRow: number
  headers: TableHeader[]
  /** Data rows, each keyed by excelCol -> cell text. Empty rows are omitted. */
  rows: Array<Record<string, string>>
  /** Tie-break score used when choosing the header row; informational. */
  textOverlap: number
}

export interface UnresolvedTable {
  questionId: string
  questionContent: string
  sheetName: string
  reason: string
}

export interface ListTableExtraction {
  resolved: ResolvedTable[]
  unresolved: UnresolvedTable[]
}

/** Section name in the DB -> worksheet name in the workbook. */
export const SECTION_TO_SHEET: Record<string, string> = {
  'Food Contact Compliance': 'Food Contact',
  'Biocides': 'Biocides',
  'Additional Requirements': 'Additional Requirements',
  'Ecolabels': 'Ecolabels',
  'Supplementary Materials': 'Additional Requirements',
}

function normalise(text: string | null | undefined): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(text: string | null | undefined): Set<string> {
  return new Set(
    normalise(text)
      .split(' ')
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  )
}

function cellText(ws: WorkSheet, row0: number, col0: number): string {
  const ref = xlsxUtils.encode_cell({ r: row0, c: col0 })
  const cell = ws[ref]
  if (!cell) return ''
  const raw = cell.w !== undefined ? cell.w : cell.v
  return raw === undefined || raw === null ? '' : String(raw).trim()
}

function sheetRowCount(ws: WorkSheet): number {
  if (!ws['!ref']) return 0
  return xlsxUtils.decode_range(ws['!ref']).e.r + 1
}

/** Resolve a worksheet by name, tolerating case and "HQ 2.1 - Food Contact" style prefixes. */
export function findSheet(workbook: WorkBook, wanted: string): WorkSheet | null {
  if (workbook.Sheets[wanted]) return workbook.Sheets[wanted]
  const lower = wanted.toLowerCase()
  const name = workbook.SheetNames.find(
    (n) => n.toLowerCase() === lower || n.toLowerCase().includes(lower)
  )
  return name ? workbook.Sheets[name] : null
}

/**
 * Rows that look like a table header: question text in column B plus at least
 * two short header-like cells in D..L. Returned as 1-based row numbers with
 * their headers.
 */
export function detectHeaderRows(ws: WorkSheet): Map<number, { questionText: string; headers: TableHeader[] }> {
  const found = new Map<number, { questionText: string; headers: TableHeader[] }>()
  const rowCount = sheetRowCount(ws)

  for (let r = 0; r < rowCount; r++) {
    const questionText = cellText(ws, r, QUESTION_TEXT_COL)
    if (!questionText || questionText.toLowerCase().startsWith('answer via')) continue

    const headers: TableHeader[] = []
    let vocabularyHits = 0
    for (let c = FIRST_TABLE_COL; c <= LAST_TABLE_COL; c++) {
      const text = cellText(ws, r, c)
      if (!text) continue
      headers.push({ excelCol: xlsxUtils.encode_col(c), text })
      const lower = text.toLowerCase()
      if (text.length < 60 && HEADER_VOCABULARY.some((v) => lower.includes(v))) vocabularyHits++
    }

    if (vocabularyHits >= 2) found.set(r + 1, { questionText, headers })
  }

  return found
}

/**
 * Read the data rows beneath a header row. Stops at the first "Note:" row or
 * after MAX_TABLE_ROWS. Rows with no value in any header column are skipped.
 */
export function readTableRows(ws: WorkSheet, headerRow: number, headers: TableHeader[]): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = []
  const cols = headers.map((h) => xlsxUtils.decode_col(h.excelCol))

  for (let offset = 1; offset <= MAX_TABLE_ROWS; offset++) {
    const r0 = headerRow - 1 + offset
    const b = cellText(ws, r0, QUESTION_TEXT_COL)
    const noteCell = cellText(ws, r0, 7) // H, where the template puts its "Note:" line
    if (b || noteCell.toLowerCase().startsWith('note')) break

    const row: Record<string, string> = {}
    let hasValue = false
    cols.forEach((c, i) => {
      const value = cellText(ws, r0, c)
      if (value && !isPlaceholderValue(value)) {
        row[headers[i].excelCol] = value
        hasValue = true
      }
    })
    if (hasValue) rows.push(row)
  }

  return rows
}

/** Empty, "n/a", or the template's own "… add free text here." prompt. */
function isPlaceholderValue(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === '' || v === '0' || v === 'n/a' || v === '-' || /add free text here/.test(v) || /^[.…]+$/.test(v)
}

function lookupRow(lookup: Record<string, CellLookupEntry>, bubbleId: string | null): { sheet: string; row: number } | null {
  if (!bubbleId) return null
  const entry = lookup[bubbleId]
  if (!entry?.cell) return null
  const row = parseInt(entry.cell.replace(/[A-Z]+/i, ''), 10)
  if (!Number.isFinite(row)) return null
  return { sheet: entry.sheet.replace(/^'|'$/g, ''), row }
}

/**
 * Locate every list-table question of the given sections in the workbook.
 * `questions` must be every question (not only tables) in DB display order,
 * because the neighbouring single-cell questions provide the anchors.
 */
export function extractListTables(
  workbook: WorkBook,
  questions: DbQuestion[],
  cellLookup: Record<string, CellLookupEntry>
): ListTableExtraction {
  const resolved: ResolvedTable[] = []
  const unresolved: UnresolvedTable[] = []

  const sections = Array.from(new Set(questions.map((q) => q.section).filter((s): s is string => Boolean(s))))

  for (const section of sections) {
    const sheetName = SECTION_TO_SHEET[section]
    if (!sheetName) continue
    const ws = findSheet(workbook, sheetName)
    if (!ws) continue

    const sectionQuestions = questions.filter((q) => q.section === section)
    const anchorRows = sectionQuestions.map((q) => {
      const hit = lookupRow(cellLookup, q.bubble_id)
      return hit && hit.sheet.toLowerCase() === sheetName.toLowerCase() ? hit.row : null
    })
    const headerRows = detectHeaderRows(ws)
    const used = new Set<number>()

    sectionQuestions.forEach((q, i) => {
      if ((q.response_type ?? '').toLowerCase() !== 'list table') return

      let low: number | null = null
      for (let p = i - 1; p >= 0; p--) {
        if (anchorRows[p] !== null) { low = anchorRows[p]; break }
      }
      let high = Number.POSITIVE_INFINITY
      for (let n = i + 1; n < sectionQuestions.length; n++) {
        if (anchorRows[n] !== null) { high = anchorRows[n] as number; break }
      }

      if (low === null) {
        unresolved.push({ questionId: q.id, questionContent: q.content ?? '', sheetName, reason: 'No mapped question precedes this table on the sheet' })
        return
      }

      const candidates = Array.from(headerRows.keys())
        .filter((r) => r > (low as number) && r < high && !used.has(r))
        .sort((a, b) => a - b)

      if (candidates.length === 0) {
        unresolved.push({
          questionId: q.id,
          questionContent: q.content ?? '',
          sheetName,
          reason: `No table header found between rows ${low} and ${Number.isFinite(high) ? high : 'end'}`,
        })
        return
      }

      const questionTokens = tokens(q.content)
      const overlap = (r: number) => {
        const t = tokens(headerRows.get(r)!.questionText)
        let shared = 0
        t.forEach((x) => { if (questionTokens.has(x)) shared++ })
        return questionTokens.size ? shared / questionTokens.size : 0
      }
      // Best text overlap wins; on a tie the earliest row (closest to the gate).
      const headerRow = candidates.reduce((best, r) => (overlap(r) > overlap(best) ? r : best), candidates[0])
      used.add(headerRow)

      const { headers } = headerRows.get(headerRow)!
      resolved.push({
        questionId: q.id,
        questionContent: q.content ?? '',
        sheetName,
        headerRow,
        headers,
        rows: readTableRows(ws, headerRow, headers),
        textOverlap: Math.round(overlap(headerRow) * 100) / 100,
      })
    })
  }

  return { resolved, unresolved }
}

// --- Column header matching -------------------------------------------------

const HEADER_QUALIFIERS = [' if any', ' if applicable', ' in mg kg', ' mg kg', ' or ppm', ' and unit', ' of regulation']

/**
 * Canonical form of a column header so "CAS Number, if any" == "CAS Number"
 * and "FCM Number of Regulation, if any" == "FCM Number, if any".
 */
export function canonicalHeader(text: string): string {
  let n = normalise(text)
  for (const q of HEADER_QUALIFIERS) n = n.replace(q, '')
  n = n.replace(/\s+/g, ' ').trim()
  const synonyms: Array<[RegExp, string]> = [
    [/^(chemical name|substance name|substance or product name|substance or product chemical name|name of substance|substance product name|chemical)$/, 'substance'],
    [/^(cas number|cas no|cas)$/, 'cas'],
    [/^(conc|concentration|conc unit)$/, 'concentration'],
    [/^(comment|comments)$/, 'comments'],
    [/^(restrictions and specifications|restrictions specifications|restrictions)$/, 'restrictions'],
  ]
  for (const [re, canon] of synonyms) if (re.test(n)) return canon
  return n
}

export interface DbListTableColumn {
  id: string
  question_id: string | null
  name: string
  order_number: number | null
}

export interface ColumnMatch {
  excelCol: string
  headerText: string
  /** Existing column id, or null when the table has no column for this header. */
  columnId: string | null
  columnName: string | null
}

/** Map a table's workbook headers to the question's list_table_columns. */
export function matchColumns(headers: TableHeader[], dbColumns: DbListTableColumn[]): ColumnMatch[] {
  const byCanon = new Map<string, DbListTableColumn>()
  for (const c of dbColumns) {
    const k = canonicalHeader(c.name)
    if (!byCanon.has(k)) byCanon.set(k, c)
  }
  const taken = new Set<string>()

  return headers.map((h) => {
    const col = byCanon.get(canonicalHeader(h.text))
    if (col && !taken.has(col.id)) {
      taken.add(col.id)
      return { excelCol: h.excelCol, headerText: h.text, columnId: col.id, columnName: col.name }
    }
    return { excelCol: h.excelCol, headerText: h.text, columnId: null, columnName: null }
  })
}

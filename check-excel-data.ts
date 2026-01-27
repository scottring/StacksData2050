import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'

const EXCEL_PATH = '/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx'

async function checkExcelData() {
  const zip = new AdmZip(EXCEL_PATH)

  // Get shared strings
  const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml')
  let sharedStrings: string[] = []
  if (sharedStringsEntry) {
    const sharedStringsXml = sharedStringsEntry.getData().toString('utf8')
    const parsed = await parseStringPromise(sharedStringsXml)
    if (parsed.sst && parsed.sst.si) {
      sharedStrings = parsed.sst.si.map((si: any) => {
        if (si.t) return String(si.t[0] || '')
        if (si.r) return si.r.map((r: any) => r.t ? String(r.t[0] || '') : '').join('')
        return ''
      })
    }
  }

  // Find STACKS TAB 2023
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

  const sheetData = sheet.worksheet.sheetData[0].row

  const getCellValue = (cell: any): string => {
    if (!cell || !cell.v) return ''
    const value = cell.v[0]
    if (cell.$.t === 's') {
      return sharedStrings[parseInt(value)] || ''
    }
    return String(value)
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

  // Check first 30 rows to see what data is actually in the Excel
  console.log('=== EXCEL DATA CHECK (First 30 rows) ===\n')
  console.log('Row | ID | Question | Type | Answer (Col H)')
  console.log('-'.repeat(100))

  for (let i = 1; i <= Math.min(30, sheetData.length - 1); i++) {
    const row = sheetData[i]
    if (!row.c) continue

    const cells: { [key: number]: string } = {}
    for (const cell of row.c) {
      const colIndex = getColumnIndex(cell.$.r)
      cells[colIndex] = getCellValue(cell)
    }

    const id = cells[0] || ''
    const question = (cells[4] || '').substring(0, 35)
    const type = cells[5] || ''
    const answer = cells[7] || ''

    const rowNum = String(i).padStart(3, ' ')
    const idStr = id.substring(0, 15).padEnd(15, ' ')
    const qStr = question.padEnd(35, ' ')
    const tStr = type.substring(0, 12).padEnd(12, ' ')
    const aStr = answer.substring(0, 30)

    console.log(`${rowNum} | ${idStr} | ${qStr} | ${tStr} | ${aStr}`)
  }

  // Count answer value distribution
  console.log('\n\n=== ANSWER VALUE DISTRIBUTION ===\n')
  const answerCounts: { [key: string]: number } = {}
  let totalAnswers = 0
  let emptyAnswers = 0

  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i]
    if (!row.c) continue

    const cells: { [key: number]: string } = {}
    for (const cell of row.c) {
      const colIndex = getColumnIndex(cell.$.r)
      cells[colIndex] = getCellValue(cell)
    }

    const answer = cells[7] || ''
    if (!answer) {
      emptyAnswers++
    } else {
      totalAnswers++
      const displayVal = answer.length > 40 ? answer.substring(0, 40) + '...' : answer
      answerCounts[displayVal] = (answerCounts[displayVal] || 0) + 1
    }
  }

  console.log(`Total rows with answers in Column H: ${totalAnswers}`)
  console.log(`Empty answer rows: ${emptyAnswers}`)
  console.log('\nTop 30 answer values:')
  Object.entries(answerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([val, count]) => {
      console.log(`  "${val}": ${count} occurrences`)
    })
}

checkExcelData().catch(console.error)

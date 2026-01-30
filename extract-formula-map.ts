import XLSX from 'xlsx'
import * as fs from 'fs'

// Use the blank template that has the formulas
const TEMPLATE_PATH = '/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/2023.11.29 - HQ 2.1 Blank template v2023-1124AM.xlsx'

interface FormulaMapping {
  bubbleId: string
  section: string
  subsection: string
  question: string
  type: string
  answerFormula: string | null  // Column H formula
  answerSheet: string | null     // Parsed: which sheet to read from
  answerCell: string | null      // Parsed: which cell to read
  additionalFormulas: string[]   // Columns I-Q for list tables
}

function parseFormula(formula: string): { sheet: string; cell: string } | null {
  if (!formula) return null
  
  // Match patterns like: '[2]Supplier Product Contact'!C20 or [2]Ecolabels!G9
  // The [2] is an external reference indicator we can ignore
  const match = formula.match(/(?:\[[\d]+\])?'?([^'!\]]+)'?!([A-Z]+\d+)/)
  if (match) {
    return { sheet: match[1], cell: match[2] }
  }
  return null
}

async function extractFormulaMap() {
  console.log('Reading template:', TEMPLATE_PATH)
  
  const wb = XLSX.readFile(TEMPLATE_PATH, { cellFormula: true })
  
  // Check if STACKS TAB 2023 exists
  if (!wb.SheetNames.includes('STACKS TAB 2023')) {
    throw new Error('STACKS TAB 2023 not found in template')
  }
  
  const ws = wb.Sheets['STACKS TAB 2023']
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Q1')
  
  const mappings: FormulaMapping[] = []
  
  // Column indices: A=0 (bubbleId), B=1 (section), C=2 (subsection), D=3 (dependent), 
  // E=4 (question), F=5 (type), G=6 (display), H=7 (answer), I-Q=8-16 (additional)
  
  for (let row = 2; row <= range.e.r + 1; row++) {
    const bubbleIdCell = ws['A' + row]
    if (!bubbleIdCell || !bubbleIdCell.v) continue
    
    const bubbleId = String(bubbleIdCell.v)
    const section = ws['B' + row]?.v ? String(ws['B' + row].v) : ''
    const subsection = ws['C' + row]?.v ? String(ws['C' + row].v) : ''
    const question = ws['E' + row]?.v ? String(ws['E' + row].v) : ''
    const type = ws['F' + row]?.v ? String(ws['F' + row].v) : ''
    
    // Get answer formula from column H
    const answerCell = ws['H' + row]
    const answerFormula = answerCell?.f || null
    const parsed = answerFormula ? parseFormula(answerFormula) : null
    
    // Get additional formulas (I-Q) for list tables
    const additionalFormulas: string[] = []
    const cols = 'IJKLMNOPQ'.split('')
    for (const col of cols) {
      const cell = ws[col + row]
      if (cell?.f) {
        additionalFormulas.push(cell.f)
      }
    }
    
    mappings.push({
      bubbleId,
      section,
      subsection,
      question: question.substring(0, 100),
      type,
      answerFormula,
      answerSheet: parsed?.sheet || null,
      answerCell: parsed?.cell || null,
      additionalFormulas
    })
  }
  
  console.log(`Extracted ${mappings.length} question mappings`)
  
  // Summary stats
  const withFormulas = mappings.filter(m => m.answerFormula)
  const bySheet = new Map<string, number>()
  withFormulas.forEach(m => {
    if (m.answerSheet) {
      bySheet.set(m.answerSheet, (bySheet.get(m.answerSheet) || 0) + 1)
    }
  })
  
  console.log(`\nQuestions with answer formulas: ${withFormulas.length}`)
  console.log('\nBy source sheet:')
  bySheet.forEach((count, sheet) => {
    console.log(`  ${sheet}: ${count}`)
  })
  
  // Save to JSON
  const outputPath = './excel-formula-map.json'
  fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2))
  console.log(`\nSaved to ${outputPath}`)
  
  // Also create a simplified lookup map for the import script
  const lookupMap: Record<string, { sheet: string; cell: string; additionalCells: Array<{ sheet: string; cell: string }> }> = {}
  
  for (const m of mappings) {
    if (m.answerSheet && m.answerCell) {
      const additionalCells = m.additionalFormulas
        .map(f => parseFormula(f))
        .filter((p): p is { sheet: string; cell: string } => p !== null)
      
      lookupMap[m.bubbleId] = {
        sheet: m.answerSheet,
        cell: m.answerCell,
        additionalCells
      }
    }
  }
  
  const lookupPath = './excel-cell-lookup.json'
  fs.writeFileSync(lookupPath, JSON.stringify(lookupMap, null, 2))
  console.log(`Saved lookup map to ${lookupPath}`)
  
  return mappings
}

extractFormulaMap().catch(console.error)

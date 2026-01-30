import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// Load the formula map
const formulaMap = JSON.parse(fs.readFileSync('excel-formula-map.json', 'utf-8'))

// Test supplier data variations
const testSuppliers = [
  {
    name: 'Acme Chemical Co.',
    address: '123 Industrial Blvd, Chicago, IL 60601',
    division: 'Specialty Chemicals',
    phone: '+1-312-555-0100',
    email: 'contact@acmechemical.com',
    contact: 'John Smith',
    productName: 'AcmeBond 5000',
    productDescription: 'High-performance adhesive for paper applications',
    productCode: 'AB-5000-X',
    productFunction: 'Surface treatment',
    producer: 'Acme Chemical Co.',
    productionSites: 'Chicago, IL'
  },
  {
    name: 'Nordic Pulp Solutions',
    address: 'Industrivägen 42, 12345 Stockholm, Sweden',
    division: 'Paper Chemicals',
    phone: '+46-8-555-1234',
    email: 'sales@nordicpulp.se',
    contact: 'Erik Johansson',
    productName: 'NordicCoat Pro',
    productDescription: 'Water-based coating for food-grade packaging',
    productCode: 'NCP-2024',
    productFunction: 'Barrier coating',
    producer: 'Nordic Pulp Solutions AB',
    productionSites: 'Stockholm, Gothenburg'
  },
  {
    name: 'Asia Pacific Additives',
    address: '888 Technology Park, Pudong, Shanghai 200120, China',
    division: 'Functional Additives',
    phone: '+86-21-5555-8888',
    email: 'info@apadd.cn',
    contact: 'Wei Chen',
    productName: 'APAdd Retention Aid',
    productDescription: 'Cationic polyacrylamide for improved retention',
    productCode: 'APA-RA-100',
    productFunction: 'Retention/drainage aid',
    producer: 'APA Manufacturing Ltd',
    productionSites: 'Shanghai, Suzhou'
  }
]

// Common dropdown answers
const yesNoAnswers = ['Yes', 'No', 'Not applicable', 'Unknown']
const complianceAnswers = ['Yes', 'No', 'Not tested', 'Partially compliant']

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateDummyAnswer(questionType: string, questionText: string): string | null {
  const type = questionType?.toLowerCase() || ''
  const text = questionText?.toLowerCase() || ''

  // Skip questions without answer cells
  if (!questionType) return null

  if (type.includes('dropdown') || type.includes('select')) {
    // Check for specific patterns
    if (text.includes('comply') || text.includes('meet') || text.includes('contain')) {
      return getRandomElement(yesNoAnswers)
    }
    return getRandomElement(['Yes', 'No'])
  }

  if (type.includes('text') || type.includes('string')) {
    if (text.includes('details') || text.includes('provide')) {
      return 'See attached documentation for full details.'
    }
    if (text.includes('cas') || text.includes('number')) {
      return '64-17-5' // Ethanol CAS
    }
    return 'Test data entry'
  }

  if (type.includes('number')) {
    return String(Math.floor(Math.random() * 100))
  }

  return 'Yes'
}

function createTestWorkbook(supplier: typeof testSuppliers[0], index: number): void {
  const wb = XLSX.utils.book_new()

  // Create sheets
  const sheets: Record<string, any[][]> = {
    'Supplier Product Contact': [],
    'Food Contact': [],
    'Ecolabels': [],
    'Biocides': [],
    'PIDSL': [],
    'Additional Requirements': []
  }

  // Initialize sheets with empty rows (need enough rows for all cells - up to 150)
  for (const sheetName of Object.keys(sheets)) {
    sheets[sheetName] = Array(150).fill(null).map(() => Array(10).fill(''))
  }

  // Populate Supplier Product Contact metadata
  const spc = sheets['Supplier Product Contact']
  spc[9][2] = supplier.name           // C10
  spc[10][2] = supplier.address       // C11
  spc[11][2] = supplier.division      // C12
  spc[12][2] = supplier.phone         // C13
  spc[13][2] = supplier.email         // C14
  spc[14][2] = supplier.contact       // C15
  spc[15][2] = new Date().toISOString().split('T')[0] // C16 - submission date
  spc[18][2] = supplier.productName   // C19
  spc[19][2] = supplier.productDescription // C20
  spc[20][2] = supplier.productCode   // C21
  spc[21][2] = supplier.productFunction // C22
  spc[22][2] = supplier.producer      // C23
  spc[23][2] = supplier.productionSites // C24

  // Populate answer cells from formula map
  for (const q of formulaMap) {
    if (!q.answerSheet || !q.answerCell) continue

    const sheetName = q.answerSheet
    if (!sheets[sheetName]) {
      sheets[sheetName] = Array(100).fill(null).map(() => Array(10).fill(''))
    }

    // Parse cell reference (e.g., "G9" -> row 8, col 6)
    const match = q.answerCell.match(/([A-Z]+)(\d+)/)
    if (!match) continue

    const col = match[1].charCodeAt(0) - 65 // A=0, B=1, etc
    const row = parseInt(match[2]) - 1 // 1-indexed to 0-indexed

    // Generate dummy answer
    const answer = generateDummyAnswer(q.type, q.question)
    if (answer && sheets[sheetName][row]) {
      sheets[sheetName][row][col] = answer
    }
  }

  // Add sheets to workbook
  for (const [sheetName, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  // Write file
  const filename = `test-workbook-${index + 1}-${supplier.name.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`
  const outputPath = path.join('test-workbooks', filename)

  // Ensure directory exists
  if (!fs.existsSync('test-workbooks')) {
    fs.mkdirSync('test-workbooks')
  }

  XLSX.writeFile(wb, outputPath)
  console.log(`Created: ${outputPath}`)
}

// Generate test workbooks
console.log('Generating test workbooks...\n')

testSuppliers.forEach((supplier, index) => {
  createTestWorkbook(supplier, index)
})

console.log('\nDone! Test workbooks created in ./test-workbooks/')
console.log('\nTo test import:')
console.log('1. Go to /import in the web app')
console.log('2. Upload one of the generated .xlsx files')
console.log('3. Review the extracted metadata and answers')
console.log('4. Click Import to create the sheet')

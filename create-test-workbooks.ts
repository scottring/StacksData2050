/**
 * Create Test Workbooks Script
 *
 * Creates 6 copies of an Excel workbook with modified product data
 * for testing the import feature.
 *
 * Usage: npx tsx create-test-workbooks.ts
 */

import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const SOURCE_FILE = '/Users/scottkaufman/Documents/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx'
const OUTPUT_DIR = '/Users/scottkaufman/Documents/test-import-workbooks'

// Test product configurations
const testProducts = [
  {
    name: 'AquaGuard Pro 500',
    companyName: 'ChemTech Industries',
    tradeName: 'AquaGuard Pro 500',
    productDescription: 'Sodium hypochlorite solution for water treatment',
    productCode: 'AGP-500',
    functionInApp: 'Biocide for paper machine water systems',
  },
  {
    name: 'BioShield Max',
    companyName: 'EcoSafe Solutions',
    tradeName: 'BioShield Max',
    productDescription: 'Chlorine dioxide based antimicrobial agent',
    productCode: 'BSM-100',
    functionInApp: 'Slime control in pulp and paper processes',
  },
  {
    name: 'PulpClear X200',
    companyName: 'Nordic Paper Chemicals',
    tradeName: 'PulpClear X200',
    productDescription: 'Hydrogen peroxide solution for bleaching',
    productCode: 'PCX-200',
    functionInApp: 'Pulp bleaching and brightening',
  },
  {
    name: 'FiberTreat Ultra',
    companyName: 'Global Additives Corp',
    tradeName: 'FiberTreat Ultra',
    productDescription: 'Polyacrylamide retention aid',
    productCode: 'FTU-300',
    functionInApp: 'Retention and drainage improvement',
  },
  {
    name: 'MillGuard 3000',
    companyName: 'Industrial Biocides Ltd',
    tradeName: 'MillGuard 3000',
    productDescription: 'Glutaraldehyde based biocide',
    productCode: 'MG-3000',
    functionInApp: 'Mill system biocide treatment',
  },
  {
    name: 'CleanPulp Eco',
    companyName: 'GreenChem Europe',
    tradeName: 'CleanPulp Eco',
    productDescription: 'Peracetic acid eco-friendly sanitizer',
    productCode: 'CPE-150',
    functionInApp: 'Environmentally friendly pulp treatment',
  },
]

function modifyWorkbook(workbook: XLSX.WorkBook, product: typeof testProducts[0]): XLSX.WorkBook {
  // Modify "Supplier Product Contact" sheet
  const contactSheet = workbook.Sheets['Supplier Product Contact']
  if (contactSheet) {
    // Based on inspection:
    // Row 9 (0-indexed): Company Name is in C9 (col B = 1)
    // Row 18: Trade Name in C18
    // Row 19: Product Description in C19

    // Company Name - cell C9 (row 8, col 2 in 0-indexed)
    const companyCell = contactSheet['C9']
    if (companyCell) {
      companyCell.v = product.companyName
      companyCell.w = product.companyName
    } else {
      contactSheet['C9'] = { t: 's', v: product.companyName, w: product.companyName }
    }

    // Trade Name - cell C18 (row 17, col 2)
    const tradeNameCell = contactSheet['C18']
    if (tradeNameCell) {
      tradeNameCell.v = product.tradeName
      tradeNameCell.w = product.tradeName
    } else {
      contactSheet['C18'] = { t: 's', v: product.tradeName, w: product.tradeName }
    }

    // Product Description - cell C19 (row 18, col 2)
    const descCell = contactSheet['C19']
    if (descCell) {
      descCell.v = product.productDescription
      descCell.w = product.productDescription
    } else {
      contactSheet['C19'] = { t: 's', v: product.productDescription, w: product.productDescription }
    }

    // Date - C15 - update to today
    const today = new Date().toLocaleDateString('en-GB')
    const dateCell = contactSheet['C15']
    if (dateCell) {
      dateCell.v = today
      dateCell.w = today
    }
  }

  // Modify "Biocides" sheet header which shows product name
  const biocidesSheet = workbook.Sheets['Biocides']
  if (biocidesSheet) {
    // Cell D1 has "HQ Version: 2.1;   Product:  FennoCide BZ26;   Supplier:  Kemira Oyj"
    const headerCell = biocidesSheet['D1']
    if (headerCell) {
      const newHeader = `HQ Version: 2.1;   Product:  ${product.tradeName};   Supplier:  ${product.companyName}`
      headerCell.v = newHeader
      headerCell.w = newHeader
    }
  }

  // Modify "Additional Requirements" sheet header
  const addReqSheet = workbook.Sheets['Additional Requirements']
  if (addReqSheet) {
    const headerCell = addReqSheet['D1']
    if (headerCell) {
      const newHeader = `HQ Version: 2.1;   Product:  ${product.tradeName};   Supplier:  ${product.companyName}`
      headerCell.v = newHeader
      headerCell.w = newHeader
    }
  }

  // Modify "PIDSL" sheet - look for similar header patterns
  const pidslSheet = workbook.Sheets['PIDSL']
  if (pidslSheet) {
    // Check common header locations
    for (const cellRef of ['D1', 'E1', 'F1']) {
      const cell = pidslSheet[cellRef]
      if (cell && String(cell.v || '').includes('FennoCide')) {
        const newValue = String(cell.v).replace(/FennoCide BZ26/g, product.tradeName).replace(/Kemira Oyj/g, product.companyName)
        cell.v = newValue
        cell.w = newValue
      }
    }
  }

  return workbook
}

async function createTestWorkbooks() {
  console.log('Creating test workbooks...\n')

  // Check if source file exists
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`Source file not found: ${SOURCE_FILE}`)
    return
  }

  // Create output directory (clear if exists)
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true })
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log(`Source: ${SOURCE_FILE}`)
  console.log(`Output directory: ${OUTPUT_DIR}\n`)

  for (let i = 0; i < testProducts.length; i++) {
    const product = testProducts[i]
    console.log(`Creating workbook ${i + 1}: ${product.name}`)

    // Read fresh copy for each modification
    const workbook = XLSX.readFile(SOURCE_FILE)

    // Modify the workbook
    modifyWorkbook(workbook, product)

    // Generate output filename
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const safeName = product.name.replace(/[^a-zA-Z0-9]/g, '-')
    const outputPath = path.join(OUTPUT_DIR, `${dateStr}-${safeName}-HQ-v2.1.xlsx`)

    // Write the modified workbook
    XLSX.writeFile(workbook, outputPath)
    console.log(`  -> ${path.basename(outputPath)}`)
  }

  console.log(`\n✓ Created ${testProducts.length} test workbooks in ${OUTPUT_DIR}`)
  console.log('\nWorkbooks ready for import testing:')
  const files = fs.readdirSync(OUTPUT_DIR)
  files.forEach(f => console.log(`  - ${f}`))
}

createTestWorkbooks().catch(console.error)

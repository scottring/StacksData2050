import * as XLSX from 'xlsx'
import { SheetExportData } from './sheet-data'

/**
 * Generates an Excel workbook from sheet export data
 */
export function generateExcelWorkbook(
  data: SheetExportData[],
  options: {
    includeMetadata?: boolean
    sapFormat?: boolean
  } = {}
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  if (data.length === 1) {
    // Single sheet export
    addSheetToWorkbook(workbook, data[0], options)
  } else {
    // Multi-sheet export: add summary first
    addSummarySheet(workbook, data)

    // Then add each sheet's data
    for (const sheetData of data) {
      addSheetToWorkbook(workbook, sheetData, options, true)
    }
  }

  return workbook
}

function addSummarySheet(workbook: XLSX.WorkBook, data: SheetExportData[]) {
  const summaryData = [
    ['Stacks Data Export Summary'],
    [''],
    ['Export Date', new Date().toISOString().split('T')[0]],
    ['Total Sheets', data.length],
    [''],
    ['Sheet Name', 'Supplier', 'Status', 'Version', 'Tags'],
    ...data.map(d => [
      d.sheet.name,
      d.supplier.name,
      d.sheet.status,
      d.sheet.version,
      d.tags.join(', ')
    ])
  ]

  const ws = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths
  ws['!cols'] = [
    { wch: 40 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 }
  ]

  XLSX.utils.book_append_sheet(workbook, ws, 'Summary')
}

function addSheetToWorkbook(
  workbook: XLSX.WorkBook,
  data: SheetExportData,
  options: { includeMetadata?: boolean; sapFormat?: boolean },
  prefixName: boolean = false
) {
  const sheetName = prefixName
    ? data.sheet.name.substring(0, 25)
    : 'Questions & Answers'

  // Main Q&A sheet
  const qaRows: any[][] = []

  if (options.sapFormat) {
    // SAP-compatible format with flat structure
    qaRows.push([
      'MATNR', // Material number (product name)
      'SECTION',
      'SUBSECTION',
      'QUESTION_NUM',
      'QUESTION_TEXT',
      'ANSWER_VALUE',
      'ANSWER_TYPE',
      'UNIT'
    ])

    for (const section of data.sections) {
      for (const subsection of section.subsections) {
        for (const question of subsection.questions) {
          qaRows.push([
            data.sheet.name,
            section.section_name,
            subsection.subsection_name,
            question.question_number,
            question.content,
            question.answer || '',
            question.response_type,
            '' // Unit placeholder
          ])
        }
      }
    }
  } else {
    // Standard hierarchical format
    qaRows.push([
      'Section',
      'Subsection',
      'Question #',
      'Question',
      'Answer',
      'Response Type'
    ])

    for (const section of data.sections) {
      for (const subsection of section.subsections) {
        for (const question of subsection.questions) {
          qaRows.push([
            section.section_name,
            subsection.subsection_name,
            question.question_number,
            question.content,
            question.answer || '',
            question.response_type
          ])
        }
      }
    }
  }

  const qaSheet = XLSX.utils.aoa_to_sheet(qaRows)
  qaSheet['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 12 },
    { wch: 60 },
    { wch: 40 },
    { wch: 15 }
  ]

  XLSX.utils.book_append_sheet(
    workbook,
    qaSheet,
    prefixName ? `${sheetName} QA` : 'Questions & Answers'
  )

  // Add list tables if present
  for (let i = 0; i < data.listTables.length; i++) {
    const listTable = data.listTables[i]
    const ltRows: any[][] = [listTable.columns]

    for (const row of listTable.rows) {
      ltRows.push(listTable.columns.map(col => row[col] || ''))
    }

    const ltSheet = XLSX.utils.aoa_to_sheet(ltRows)
    ltSheet['!cols'] = listTable.columns.map(() => ({ wch: 20 }))

    const ltName = prefixName
      ? `${data.sheet.name.substring(0, 20)} LT${i + 1}`
      : `List Table ${i + 1}`

    XLSX.utils.book_append_sheet(workbook, ltSheet, ltName)
  }

  // Add metadata sheet if requested
  if (options.includeMetadata && !prefixName) {
    const metaRows = [
      ['Stacks Export Metadata'],
      [''],
      ['Product/Sheet Name', data.sheet.name],
      ['Status', data.sheet.status],
      ['Version', data.sheet.version],
      [''],
      ['Supplier', data.supplier.name],
      ['Customer', data.customer?.name || 'N/A'],
      [''],
      ['Tags', data.tags.join(', ')],
      [''],
      ['Created', data.sheet.created_at],
      ['Last Modified', data.sheet.modified_at],
      ['Export Date', new Date().toISOString()],
      [''],
      ['Exported from Stacks - Environmental Compliance Data Platform'],
      ['https://stacksdata.com']
    ]

    const metaSheet = XLSX.utils.aoa_to_sheet(metaRows)
    metaSheet['!cols'] = [{ wch: 25 }, { wch: 50 }]

    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata')
  }
}

/**
 * Converts workbook to Uint8Array for download
 */
export function workbookToBuffer(
  workbook: XLSX.WorkBook,
  format: 'xlsx' | 'csv' = 'xlsx'
): Uint8Array {
  if (format === 'csv') {
    // For CSV, only export the first sheet
    const firstSheetName = workbook.SheetNames[0]
    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName])
    return new TextEncoder().encode(csvContent)
  }

  return new Uint8Array(XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx'
  }))
}

/**
 * Gets the appropriate content type for the export format
 */
export function getContentType(format: 'xlsx' | 'csv'): string {
  return format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv'
}

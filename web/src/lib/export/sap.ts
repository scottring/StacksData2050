import { SheetExportData } from './sheet-data'

/**
 * SAP IDoc-compatible export formats for integration with SAP ERP systems
 */

export interface SAPIdocExport {
  IDOC: {
    EDI_DC40: {
      DOCNUM: string
      DOCTYP: string
      MESTYP: string
      SNDPOR: string
      SNDPRT: string
      SNDPRN: string
      RCVPOR: string
      RCVPRT: string
      RCVPRN: string
      CREDAT: string
      CRETIM: string
    }
    E1MARAM: {
      MSGFN: string
      MATNR: string
      MBRSH: string
      MTART: string
      MEINS: string
      Z_SUPPLIER_NAME: string
      Z_COMPLIANCE_STATUS: string
      Z_LAST_UPDATE: string
      Z_TAGS: string
      E1MVKEM: SAPAnswerSegment[]
    }
  }
}

export interface SAPAnswerSegment {
  MSGFN: string
  VKORG: string       // Section number
  VTWEG: string       // Subsection number
  MATNR: string       // Material/Product
  QUESTION_NUM: string
  QUESTION_TEXT: string
  ANSWER_VALUE: string
  ANSWER_TYPE: string
  UNIT?: string
}

/**
 * Converts sheet data to SAP IDoc-compatible JSON format
 */
export function convertToSAPFormat(data: SheetExportData): SAPIdocExport {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '') // HHMMSS

  const answerSegments: SAPAnswerSegment[] = []

  for (const section of data.sections) {
    for (const subsection of section.subsections) {
      for (const question of subsection.questions) {
        answerSegments.push({
          MSGFN: '009',
          VKORG: String(section.section_number).padStart(4, '0'),
          VTWEG: String(subsection.subsection_number).padStart(2, '0'),
          MATNR: data.sheet.name.substring(0, 18).toUpperCase(),
          QUESTION_NUM: question.question_number,
          QUESTION_TEXT: question.content.substring(0, 255),
          ANSWER_VALUE: (question.answer || '').substring(0, 255),
          ANSWER_TYPE: mapResponseTypeToSAP(question.response_type)
        })
      }
    }
  }

  return {
    IDOC: {
      EDI_DC40: {
        DOCNUM: data.sheet.id.substring(0, 16).toUpperCase(),
        DOCTYP: 'MATMAS',
        MESTYP: 'MATMAS',
        SNDPOR: 'STACKS',
        SNDPRT: 'LS',
        SNDPRN: 'STACKSDATA',
        RCVPOR: 'SAPCLNT',
        RCVPRT: 'LS',
        RCVPRN: 'SAPERP',
        CREDAT: dateStr,
        CRETIM: timeStr
      },
      E1MARAM: {
        MSGFN: '009',
        MATNR: data.sheet.name.substring(0, 18).toUpperCase(),
        MBRSH: 'C', // Industry sector: Chemicals
        MTART: 'ZRAW', // Material type
        MEINS: 'EA', // Base unit: Each
        Z_SUPPLIER_NAME: data.supplier.name.substring(0, 40),
        Z_COMPLIANCE_STATUS: mapStatusToSAP(data.sheet.status),
        Z_LAST_UPDATE: data.sheet.modified_at.split('T')[0].replace(/-/g, ''),
        Z_TAGS: data.tags.join(';').substring(0, 255),
        E1MVKEM: answerSegments
      }
    }
  }
}

/**
 * Converts sheet data to SAP IDoc XML format
 */
export function convertToSAPXML(data: SheetExportData): string {
  const idoc = convertToSAPFormat(data)

  return `<?xml version="1.0" encoding="UTF-8"?>
<MATMAS07>
  <IDOC BEGIN="1">
    <EDI_DC40 SEGMENT="1">
      <TABNAM>EDI_DC40</TABNAM>
      <DOCNUM>${escapeXml(idoc.IDOC.EDI_DC40.DOCNUM)}</DOCNUM>
      <DOCREL>740</DOCREL>
      <STATUS>30</STATUS>
      <DIRECT>1</DIRECT>
      <OUTMOD>2</OUTMOD>
      <IDOCTYP>MATMAS07</IDOCTYP>
      <MESTYP>${escapeXml(idoc.IDOC.EDI_DC40.MESTYP)}</MESTYP>
      <SNDPOR>${escapeXml(idoc.IDOC.EDI_DC40.SNDPOR)}</SNDPOR>
      <SNDPRT>${escapeXml(idoc.IDOC.EDI_DC40.SNDPRT)}</SNDPRT>
      <SNDPRN>${escapeXml(idoc.IDOC.EDI_DC40.SNDPRN)}</SNDPRN>
      <RCVPOR>${escapeXml(idoc.IDOC.EDI_DC40.RCVPOR)}</RCVPOR>
      <RCVPRT>${escapeXml(idoc.IDOC.EDI_DC40.RCVPRT)}</RCVPRT>
      <RCVPRN>${escapeXml(idoc.IDOC.EDI_DC40.RCVPRN)}</RCVPRN>
      <CREDAT>${escapeXml(idoc.IDOC.EDI_DC40.CREDAT)}</CREDAT>
      <CRETIM>${escapeXml(idoc.IDOC.EDI_DC40.CRETIM)}</CRETIM>
    </EDI_DC40>
    <E1MARAM SEGMENT="1">
      <MSGFN>${escapeXml(idoc.IDOC.E1MARAM.MSGFN)}</MSGFN>
      <MATNR>${escapeXml(idoc.IDOC.E1MARAM.MATNR)}</MATNR>
      <MBRSH>${escapeXml(idoc.IDOC.E1MARAM.MBRSH)}</MBRSH>
      <MTART>${escapeXml(idoc.IDOC.E1MARAM.MTART)}</MTART>
      <MEINS>${escapeXml(idoc.IDOC.E1MARAM.MEINS)}</MEINS>
${idoc.IDOC.E1MARAM.E1MVKEM.map(segment => `      <E1MVKEM SEGMENT="1">
        <MSGFN>${escapeXml(segment.MSGFN)}</MSGFN>
        <VKORG>${escapeXml(segment.VKORG)}</VKORG>
        <VTWEG>${escapeXml(segment.VTWEG)}</VTWEG>
        <MATNR>${escapeXml(segment.MATNR)}</MATNR>
        <ZQUESTION_NUM>${escapeXml(segment.QUESTION_NUM)}</ZQUESTION_NUM>
        <ZQUESTION_TEXT>${escapeXml(segment.QUESTION_TEXT)}</ZQUESTION_TEXT>
        <ZANSWER_VALUE>${escapeXml(segment.ANSWER_VALUE)}</ZANSWER_VALUE>
        <ZANSWER_TYPE>${escapeXml(segment.ANSWER_TYPE)}</ZANSWER_TYPE>
      </E1MVKEM>`).join('\n')}
    </E1MARAM>
  </IDOC>
</MATMAS07>`
}

/**
 * Maps Stacks response types to SAP-compatible type codes
 */
function mapResponseTypeToSAP(responseType: string): string {
  const typeMap: Record<string, string> = {
    'text': 'CHAR',
    'text_area': 'CHAR',
    'number': 'DEC',
    'boolean': 'BOOL',
    'date': 'DATS',
    'choice': 'CHAR',
    'dropdown': 'CHAR',
    'file': 'FILE',
    'list_table': 'TABL'
  }
  return typeMap[responseType] || 'CHAR'
}

/**
 * Maps Stacks status to SAP-compatible status code
 */
function mapStatusToSAP(status: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'DRFT',
    'submitted': 'SUBM',
    'approved': 'APPR',
    'flagged': 'REVW',
    'rejected': 'REJD'
  }
  return statusMap[status] || 'UNKN'
}

/**
 * Escapes special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Creates a simple JSON export with SAP-friendly field names
 */
export function convertToSAPSimpleJSON(data: SheetExportData): object {
  return {
    material: {
      material_number: data.sheet.name.substring(0, 18).toUpperCase(),
      material_type: 'ZRAW',
      industry_sector: 'C',
      base_unit: 'EA'
    },
    supplier: {
      name: data.supplier.name,
      id: data.supplier.id
    },
    compliance: {
      status: mapStatusToSAP(data.sheet.status),
      status_text: data.sheet.status,
      version: data.sheet.version,
      last_update: data.sheet.modified_at,
      tags: data.tags
    },
    questionnaire: data.sections.flatMap(section =>
      section.subsections.flatMap(subsection =>
        subsection.questions.map(q => ({
          section: section.section_name,
          section_code: String(section.section_number).padStart(4, '0'),
          subsection: subsection.subsection_name,
          subsection_code: String(subsection.subsection_number).padStart(2, '0'),
          question_number: q.question_number,
          question: q.content,
          answer: q.answer,
          data_type: mapResponseTypeToSAP(q.response_type)
        }))
      )
    ),
    export_metadata: {
      exported_at: new Date().toISOString(),
      export_source: 'Stacks Data Platform',
      format_version: '1.0'
    }
  }
}

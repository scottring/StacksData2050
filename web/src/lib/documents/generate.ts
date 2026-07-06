import { renderToBuffer } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { REACHSVHCDeclaration } from './templates/reach-svhc-declaration'
import { FDAComplianceLetter } from './templates/fda-compliance-letter'
import { ChinaGBCertificate } from './templates/china-gb-certificate'
import { generateDPPJsonLD } from './templates/dpp-json-ld'
import { REACH_SVHC_CAS, PROP_65_CAS, BFR_FOOD_CONTACT_RESTRICTED_CAS } from '../compliance/seed'
import React from 'react'

// Helper to render React PDF elements — the @react-pdf/renderer types are strict about Document props
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPdf(element: ReactElement): Promise<Buffer> {
  return renderToBuffer(element as any)
}

export type DocumentType = 'reach_svhc_declaration' | 'fda_compliance_letter' | 'dpp_json_ld' | 'china_gb_certificate'

interface GenerateDocumentInput {
  assessmentId: string
  documentType: DocumentType
  language?: string
}

interface GenerateDocumentResult {
  documentId: string
  fileName: string
  mimeType: string
  status: 'ready' | 'failed'
  error?: string
}

const svhcSet = new Set(REACH_SVHC_CAS)
const prop65Set = new Set(PROP_65_CAS)
const foodContactSet = new Set(BFR_FOOD_CONTACT_RESTRICTED_CAS)

export async function generateDocument(input: GenerateDocumentInput): Promise<GenerateDocumentResult> {
  const supabase = await createClient()

  // Fetch assessment + results
  const { data: assessment } = await supabase
    .from('compliance_assessments')
    .select('*')
    .eq('id', input.assessmentId)
    .single()

  if (!assessment) {
    return { documentId: '', fileName: '', mimeType: '', status: 'failed', error: 'Assessment not found' }
  }

  // Get chemicals from sheet or extraction
  const chemicals = await getChemicalsForAssessment(assessment)

  // Get company info
  const { data: company } = assessment.company_id
    ? await supabase.from('companies').select('name').eq('id', assessment.company_id).single()
    : { data: null }

  const companyName = company?.name || 'Unknown Company'
  const date = new Date().toISOString().split('T')[0]
  const refNumber = `STK-${input.documentType.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`

  // Create the DB record first
  const { data: docRecord, error: createError } = await supabase
    .from('generated_documents')
    .insert({
      assessment_id: input.assessmentId,
      sheet_id: assessment.sheet_id,
      company_id: assessment.company_id,
      document_type: input.documentType,
      file_name: `${refNumber}.${input.documentType === 'dpp_json_ld' ? 'json' : 'pdf'}`,
      mime_type: input.documentType === 'dpp_json_ld' ? 'application/json' : 'application/pdf',
      language: input.language || 'en',
      status: 'generating',
    })
    .select()
    .single()

  if (createError || !docRecord) {
    return { documentId: '', fileName: '', mimeType: '', status: 'failed', error: 'Failed to create document record' }
  }

  try {
    let fileBuffer: Buffer
    let mimeType: string
    let fileName: string

    switch (input.documentType) {
      case 'reach_svhc_declaration': {
        const element = React.createElement(REACHSVHCDeclaration, {
          productName: assessment.product_name,
          companyName,
          date,
          overallStatus: assessment.overall_status,
          chemicals: chemicals.map(c => ({
            cas_number: c.cas_number,
            chemical_name: c.chemical_name,
            concentration_pct: c.concentration_pct,
            status: (svhcSet.has(c.cas_number) && c.concentration_pct != null && c.concentration_pct > 0.1)
              ? 'fail' as const
              : svhcSet.has(c.cas_number) ? 'warning' as const : 'pass' as const,
          })),
          assessmentId: input.assessmentId,
          declarationNumber: refNumber,
        })
        fileBuffer = await renderPdf(element)
        mimeType = 'application/pdf'
        fileName = `${refNumber}-REACH-SVHC-Declaration.pdf`
        break
      }

      case 'fda_compliance_letter': {
        const element = React.createElement(FDAComplianceLetter, {
          productName: assessment.product_name,
          companyName,
          recipientName: 'Regulatory Compliance Department',
          date,
          chemicals: chemicals.map(c => ({
            cas_number: c.cas_number,
            chemical_name: c.chemical_name,
            concentration_pct: c.concentration_pct,
            fda_status: foodContactSet.has(c.cas_number) ? 'Restricted' : 'Acceptable',
          })),
          prop65Chemicals: chemicals
            .filter(c => prop65Set.has(c.cas_number))
            .map(c => c.chemical_name),
          overallCompliant: !chemicals.some(c => foodContactSet.has(c.cas_number)),
          letterNumber: refNumber,
        })
        fileBuffer = await renderPdf(element)
        mimeType = 'application/pdf'
        fileName = `${refNumber}-FDA-Compliance-Letter.pdf`
        break
      }

      case 'dpp_json_ld': {
        const jsonLD = generateDPPJsonLD({
          productName: assessment.product_name,
          productId: assessment.sheet_id || assessment.id,
          companyName,
          companyId: assessment.company_id || 'unknown',
          assessmentId: input.assessmentId,
          date,
          chemicals: chemicals.map(c => ({
            cas_number: c.cas_number,
            chemical_name: c.chemical_name,
            concentration_pct: c.concentration_pct,
            is_svhc: svhcSet.has(c.cas_number),
            function_in_product: c.function_in_product,
          })),
          overallStatus: assessment.overall_status,
          frameworks: [], // Will be populated from results
        })
        fileBuffer = Buffer.from(JSON.stringify(jsonLD, null, 2), 'utf-8')
        mimeType = 'application/json'
        fileName = `${refNumber}-DPP.json`

        // Store the DPP credential in the record
        await supabase
          .from('generated_documents')
          .update({ dpp_credential: jsonLD })
          .eq('id', docRecord.id)
        break
      }

      case 'china_gb_certificate': {
        const element = React.createElement(ChinaGBCertificate, {
          productName: assessment.product_name,
          companyName,
          date,
          chemicals: chemicals.map(c => ({
            cas_number: c.cas_number,
            chemical_name: c.chemical_name,
            concentration_pct: c.concentration_pct,
            gb_status: foodContactSet.has(c.cas_number) ? 'Restricted' : 'Compliant',
            sml_mg_kg: null,
          })),
          overallCompliant: assessment.overall_status !== 'fail',
          certificateNumber: refNumber,
          applicableStandards: [
            'GB 9685-2016 — Hygienic Standard for Use of Additives in Food Contact Materials',
            'GB 4806.1-2016 — General Safety Requirements',
            'GB 31604 Series — Migration Testing Methods',
          ],
        })
        fileBuffer = await renderPdf(element)
        mimeType = 'application/pdf'
        fileName = `${refNumber}-China-GB-Certificate.pdf`
        break
      }

      default:
        throw new Error(`Unknown document type: ${input.documentType}`)
    }

    // Upload to Supabase Storage
    const filePath = `${assessment.company_id || 'global'}/${input.assessmentId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('generated-documents')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload document: ${uploadError.message}`)
    }

    // Update the document record
    await supabase
      .from('generated_documents')
      .update({
        file_path: filePath,
        file_name: fileName,
        mime_type: mimeType,
        status: 'ready',
      })
      .eq('id', docRecord.id)

    return {
      documentId: docRecord.id,
      fileName,
      mimeType,
      status: 'ready',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('generated_documents')
      .update({ status: 'failed' })
      .eq('id', docRecord.id)

    return {
      documentId: docRecord.id,
      fileName: '',
      mimeType: '',
      status: 'failed',
      error: errorMessage,
    }
  }
}

async function getChemicalsForAssessment(assessment: Record<string, unknown>) {
  const supabase = await createClient()

  interface ChemicalRecord {
    cas_number: string
    chemical_name: string
    concentration_pct: number | null
    function_in_product: string | null
  }

  // Try from chemical_inventory via sheet
  if (assessment.sheet_id) {
    const { data: sheetChemicals } = await supabase
      .from('sheet_chemicals')
      .select('chemical_inventory(cas_number, chemical_name, concentration_pct)')
      .eq('sheet_id', assessment.sheet_id as string)

    if (sheetChemicals && sheetChemicals.length > 0) {
      return sheetChemicals
        .filter((sc: Record<string, unknown>) => sc.chemical_inventory)
        .map((sc: Record<string, unknown>) => {
          const ci = sc.chemical_inventory as Record<string, unknown>
          return {
            cas_number: ci.cas_number as string,
            chemical_name: (ci.chemical_name as string) || 'Unknown',
            concentration_pct: ci.concentration_pct as number | null,
            function_in_product: null as string | null,
          }
        })
    }
  }

  // Fall back to extraction items
  const { data: extractionDocs } = assessment.sheet_id
    ? await supabase
        .from('extraction_documents')
        .select('id')
        .eq('sheet_id', assessment.sheet_id as string)
    : { data: null }

  if (extractionDocs && extractionDocs.length > 0) {
    const docIds = extractionDocs.map((d: { id: string }) => d.id)
    const { data: items } = await supabase
      .from('extraction_items')
      .select('data')
      .eq('item_type', 'chemical')
      .in('document_id', docIds)

    if (items) {
      return items.map((item: { data: Record<string, unknown> }) => ({
        cas_number: (item.data.cas_number as string) || '',
        chemical_name: (item.data.chemical_name as string) || 'Unknown',
        concentration_pct: item.data.concentration_pct as number | null,
        function_in_product: item.data.function_in_product as string | null,
      })).filter((c: ChemicalRecord) => c.cas_number)
    }
  }

  return [] as ChemicalRecord[]
}

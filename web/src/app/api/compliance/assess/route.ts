import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateAssessment } from '@/lib/compliance/engine'
import { FRAMEWORK_SEEDS } from '@/lib/compliance/seed'
import type { ChemicalInput, FrameworkWithRules, RegulatoryRule } from '@/lib/compliance/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { sheet_id, document_id, product_name } = body

  if (!sheet_id && !document_id && !product_name) {
    return NextResponse.json({ error: 'sheet_id, document_id, or product_name is required' }, { status: 400 })
  }

  // Fetch chemicals for this sheet/product/document
  let chemicals: ChemicalInput[] = []

  if (document_id) {
    // Get chemicals directly from extraction items for this document
    const { data: extractionItems } = await supabase
      .from('extraction_items')
      .select('data')
      .eq('item_type', 'chemical')
      .eq('document_id', document_id)

    if (extractionItems) {
      chemicals = extractionItems.map((item: { data: Record<string, unknown> }) => ({
        cas_number: (item.data.cas_number as string) || '',
        chemical_name: (item.data.chemical_name as string) || 'Unknown',
        concentration_pct: (item.data.concentration_min_pct as number) ?? (item.data.concentration_pct as number) ?? null,
        concentration_max_pct: (item.data.concentration_max_pct as number) ?? null,
        molecular_formula: (item.data.molecular_formula as string) ?? null,
        is_pfas: false,
        is_reach_svhc: false,
        is_prop65: false,
        is_food_contact_restricted: false,
      })).filter((c: ChemicalInput) => c.cas_number)
    }
  } else if (sheet_id) {
    // Get chemicals linked to this sheet via extraction
    const { data: sheetChemicals } = await supabase
      .from('sheet_chemicals')
      .select('chemical_inventory(*)')
      .eq('sheet_id', sheet_id)

    if (sheetChemicals) {
      chemicals = sheetChemicals
        .filter((sc: Record<string, unknown>) => sc.chemical_inventory)
        .map((sc: Record<string, unknown>) => {
          const ci = sc.chemical_inventory as Record<string, unknown>
          return {
            cas_number: ci.cas_number as string,
            chemical_name: (ci.chemical_name as string) || 'Unknown',
            concentration_pct: ci.concentration_pct as number | null,
            concentration_max_pct: ci.concentration_max_pct as number | null,
            molecular_formula: ci.molecular_formula as string | null,
            is_pfas: ci.is_pfas as boolean,
            is_reach_svhc: ci.is_reach_svhc as boolean,
            is_prop65: ci.is_prop65 as boolean,
            is_food_contact_restricted: ci.is_food_contact_restricted as boolean,
          }
        })
    }

    // Also get chemicals from extraction items linked to this sheet
    if (chemicals.length === 0) {
      const { data: docs } = await supabase
        .from('extraction_documents')
        .select('id')
        .eq('sheet_id', sheet_id)

      const docIds = docs?.map((d: { id: string }) => d.id) || []

      const { data: extractionItems } = docIds.length > 0
        ? await supabase
            .from('extraction_items')
            .select('data')
            .eq('item_type', 'chemical')
            .in('document_id', docIds)
        : { data: null }

      if (extractionItems) {
        chemicals = extractionItems.map((item: { data: Record<string, unknown> }) => ({
          cas_number: (item.data.cas_number as string) || '',
          chemical_name: (item.data.chemical_name as string) || 'Unknown',
          concentration_pct: item.data.concentration_pct as number | null,
          concentration_max_pct: item.data.concentration_max_pct as number | null,
          molecular_formula: item.data.molecular_formula as string | null,
          is_pfas: false,
          is_reach_svhc: false,
          is_prop65: false,
          is_food_contact_restricted: false,
        })).filter((c: ChemicalInput) => c.cas_number)
      }
    }
  }

  console.log('[Compliance] Chemicals found:', chemicals.length, chemicals.map(c => `${c.cas_number} (${c.chemical_name})`))

  if (chemicals.length === 0) {
    return NextResponse.json({ error: 'No chemicals found for assessment' }, { status: 400 })
  }

  // Load frameworks from database or fall back to seeds
  let frameworks: FrameworkWithRules[] = []

  const { data: dbFrameworks } = await supabase
    .from('regulatory_frameworks')
    .select('*')
    .eq('active', true)

  // Check for DB rules first
  let dbRulesCount = 0
  if (dbFrameworks && dbFrameworks.length > 0) {
    const { data: dbRules } = await supabase
      .from('regulatory_rules')
      .select('*')
      .in('framework_id', dbFrameworks.map((f: { id: string }) => f.id))
    dbRulesCount = dbRules?.length ?? 0

    if (dbRulesCount > 0) {
      // Use DB frameworks + rules
      frameworks = dbFrameworks.map((fw: Record<string, unknown>) => ({
        id: fw.id as string,
        code: fw.code as string,
        name: fw.name as string,
        jurisdiction: fw.jurisdiction as string,
        rules: (dbRules || [])
          .filter((r: Record<string, unknown>) => r.framework_id === fw.id)
          .map((r: Record<string, unknown>) => r as unknown as RegulatoryRule),
      }))
    }
  }

  // Fall back to seed data if no DB rules exist
  if (dbRulesCount === 0) {
    // Use DB framework IDs where available, seed IDs otherwise
    const dbFrameworkByCode = new Map(
      (dbFrameworks || []).map((fw: Record<string, unknown>) => [fw.code as string, fw.id as string])
    )

    frameworks = FRAMEWORK_SEEDS.map((seed) => {
      const frameworkId = dbFrameworkByCode.get(seed.code) || `seed-${seed.code}`
      return {
        id: frameworkId,
        code: seed.code,
        name: seed.name,
        jurisdiction: seed.jurisdiction,
        rules: seed.rules.map((r, j) => ({
          id: `seed-${seed.code}-${j}`,
          framework_id: frameworkId,
          code: r.code,
          name: r.name,
          category: r.category,
          rule_type: r.rule_type,
          rule_config: r.rule_config,
          severity: r.severity,
          message_template: r.message_template,
          remediation_text: r.remediation_text,
        } as RegulatoryRule)),
      }
    })
  }

  console.log('[Compliance] Frameworks:', frameworks.map(f => `${f.code} (${f.rules.length} rules)`))

  // Run assessment
  const assessment = evaluateAssessment(chemicals, frameworks)

  // Get user's company_id
  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Store the assessment
  const { data: savedAssessment, error: saveError } = await supabase
    .from('compliance_assessments')
    .insert({
      sheet_id: sheet_id || null,
      company_id: profile?.company_id || null,
      product_name: product_name || 'Unknown Product',
      overall_status: assessment.overall_status,
      total_rules_evaluated: assessment.total_rules_evaluated,
      rules_passed: assessment.rules_passed,
      rules_failed: assessment.rules_failed,
      rules_warning: assessment.rules_warning,
    })
    .select()
    .single()

  if (saveError || !savedAssessment) {
    return NextResponse.json({ error: 'Failed to save assessment', detail: saveError?.message }, { status: 500 })
  }

  // Store individual results
  const resultsToInsert = assessment.results.map(r => ({
    assessment_id: savedAssessment.id,
    rule_id: r.rule_id.startsWith('seed-') ? null : r.rule_id,
    framework_id: r.framework_id.startsWith('seed-') ? null : r.framework_id,
    status: r.status,
    triggered_by: r.triggered_by,
    message: r.message,
    rule_code: r.rule_id, // Store the rule reference even for seed rules
    framework_code: frameworks.find(f => f.id === r.framework_id)?.code || null,
  }))

  await supabase.from('compliance_results').insert(resultsToInsert)

  return NextResponse.json({
    assessment_id: savedAssessment.id,
    ...assessment,
  })
}

import { supabase } from './src/migration/supabase-client.js'
import { lookupCAS, checkRegulatoryStatus } from './lib/pubchem.js'
import {
  extractCASNumber,
  parseConcentration,
  parseChemicalField,
  normalizeConcentration,
  isValidCASFormat,
} from './lib/cas-parser.js'

/**
 * CAS Number Migration to Chemical Inventory
 *
 * This script:
 * 1. Extracts all CAS numbers from answers (biocides section 3.1.2)
 *    - Handles messy data: "Glutaraldehyde 111-30-8 < 150"
 *    - Parses concentration operators: < 150, > 5, 5-10
 *    - Extracts CAS from mixed text fields
 * 2. Deduplicates CAS numbers
 * 3. Enriches each unique CAS via PubChem API
 * 4. Checks regulatory status (PFAS, REACH, Prop 65, etc.)
 * 5. Inserts into chemical_inventory table
 * 6. Creates sheet_chemicals links with concentration data
 */

// Constants from biocides section
const BIOCIDES_QUESTION_ID = '55eeea30-92d0-492e-aa44-37819705fbb0'
const CAS_COLUMN_ID = '5e22b0e9-0a67-49ab-9734-b1ec6cf5e14b'
const CONCENTRATION_COLUMN_ID = '7481500b-5aa2-4731-929f-8483ef6e5434'
const UNIT_COLUMN_ID = 'c609f59f-1676-4e1d-b506-9531aa9b6167'

// Rate limiting: Wait between PubChem API calls
const PUBCHEM_DELAY_MS = 250 // 4 requests per second max

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function migrateCASNumbers() {
  console.log('=== Migrating CAS Numbers to Chemical Inventory ===\n')

  // Step 1: Extract all CAS numbers from answers
  console.log('Step 1: Extracting CAS numbers from sheets...\n')

  const { data: casAnswers, error: fetchError } = await supabase
    .from('answers')
    .select('id, text_value, sheet_id, list_table_row_id')
    .eq('parent_question_id', BIOCIDES_QUESTION_ID)
    .eq('list_table_column_id', CAS_COLUMN_ID)
    .not('text_value', 'is', null)
    .not('sheet_id', 'is', null) // Skip orphaned answers

  if (fetchError) {
    console.error('❌ Error fetching CAS answers:', fetchError)
    return
  }

  console.log(`Found ${casAnswers?.length || 0} raw CAS entries\n`)

  // Parse CAS numbers from messy data
  console.log('Parsing CAS numbers (handling mixed fields)...\n')

  const parsedCAS = casAnswers?.map(answer => {
    const parsed = parseChemicalField(answer.text_value || '')
    return {
      ...answer,
      extractedCAS: parsed.casNumber,
      extractedName: parsed.chemicalName,
      confidence: parsed.confidence,
    }
  })

  const validCAS = parsedCAS?.filter(p => p.extractedCAS && isValidCASFormat(p.extractedCAS))

  console.log(`  Extracted ${validCAS?.length || 0} valid CAS numbers`)
  console.log(`  Skipped ${(casAnswers?.length || 0) - (validCAS?.length || 0)} invalid/unparseable entries\n`)

  // Step 2: Deduplicate CAS numbers
  console.log('Step 2: Deduplicating CAS numbers...\n')

  const uniqueCAS = [...new Set(validCAS?.map(v => v.extractedCAS).filter(Boolean) || [])]

  console.log(`Unique CAS numbers: ${uniqueCAS.length}\n`)

  // Step 3: Enrich each CAS number via PubChem
  console.log('Step 3: Enriching CAS numbers via PubChem API...\n')
  console.log('⏱️  This will take ~' + Math.ceil((uniqueCAS.length * PUBCHEM_DELAY_MS) / 1000 / 60) + ' minutes\n')

  let enriched = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < uniqueCAS.length; i++) {
    const cas = uniqueCAS[i]
    const progress = `[${i + 1}/${uniqueCAS.length}]`

    try {
      console.log(`${progress} Processing: ${cas}`)

      // Check if already exists
      const { data: existing } = await supabase
        .from('chemical_inventory')
        .select('id')
        .eq('cas_number', cas)
        .single()

      if (existing) {
        console.log(`  ↷ Already exists, skipping`)
        skipped++
        continue
      }

      // Lookup chemical data from PubChem
      const chemicalData = await lookupCAS(cas)

      if (!chemicalData) {
        console.log(`  ✗ Not found in PubChem`)
        failed++
        await sleep(PUBCHEM_DELAY_MS)
        continue
      }

      // Check regulatory status
      const regulatory = checkRegulatoryStatus(cas, chemicalData.name || '')

      // Determine risk level
      let riskLevel: 'high' | 'medium' | 'low' = 'low'
      if (regulatory.pfas || regulatory.reachSVHC || regulatory.prop65) {
        riskLevel = 'high'
      } else if (regulatory.rohs || regulatory.fdaFCN) {
        riskLevel = 'medium'
      }

      // Insert into chemical_inventory
      const { data: chemical, error: insertError } = await supabase
        .from('chemical_inventory')
        .insert({
          cas_number: cas,
          pubchem_cid: chemicalData.pubchemCid,
          chemical_name: chemicalData.name,
          molecular_formula: chemicalData.molecularFormula,
          molecular_weight: chemicalData.molecularWeight,
          synonyms: chemicalData.synonyms || [],
          iupac_name: chemicalData.iupacName,
          inchi_key: chemicalData.inchiKey,
          is_pfas: regulatory.pfas,
          is_reach_svhc: regulatory.reachSVHC,
          is_prop65: regulatory.prop65,
          is_epa_tosca: regulatory.tosca,
          is_rohs: regulatory.rohs,
          is_food_contact_restricted: regulatory.fdaFCN,
          risk_level: riskLevel,
          warnings: regulatory.warnings || [],
          restrictions: [],
          hazards: chemicalData.hazards || [],
        })
        .select()
        .single()

      if (insertError) {
        console.log(`  ✗ Error: ${insertError.message}`)
        failed++
        await sleep(PUBCHEM_DELAY_MS)
        continue
      }

      console.log(`  ✓ Enriched: ${chemicalData.name}`)
      if (regulatory.pfas) console.log(`    ⚠️  PFAS detected`)
      if (regulatory.reachSVHC) console.log(`    ⚠️  REACH SVHC`)
      if (regulatory.prop65) console.log(`    ⚠️  Prop 65`)

      enriched++

      // Rate limit: Wait between requests
      await sleep(PUBCHEM_DELAY_MS)
    } catch (err) {
      console.log(`  ✗ Error: ${err}`)
      failed++
      await sleep(PUBCHEM_DELAY_MS)
    }
  }

  console.log(`\n✅ Enrichment complete:`)
  console.log(`   ${enriched} succeeded`)
  console.log(`   ${skipped} skipped (already exist)`)
  console.log(`   ${failed} failed\n`)

  // Step 4: Create sheet_chemicals links
  console.log('Step 4: Creating sheet-chemical links with concentration data...\n')

  let linked = 0
  let linkFailed = 0

  for (const parsedAnswer of validCAS || []) {
    const cas = parsedAnswer.extractedCAS
    if (!cas) continue

    // Find chemical in inventory
    const { data: chemical } = await supabase
      .from('chemical_inventory')
      .select('id')
      .eq('cas_number', cas)
      .maybeSingle()

    if (!chemical) {
      console.log(`  ↷ Chemical not found in inventory: ${cas}`)
      linkFailed++
      continue
    }

    // Get concentration for this row - try both number_value and text_value
    const { data: concentrationAnswer } = await supabase
      .from('answers')
      .select('number_value, text_value')
      .eq('sheet_id', parsedAnswer.sheet_id)
      .eq('list_table_row_id', parsedAnswer.list_table_row_id)
      .eq('list_table_column_id', CONCENTRATION_COLUMN_ID)
      .maybeSingle()

    // Parse concentration (handles < 150, > 5, 5-10, etc.)
    let concentrationValue: number | null = null
    let concentrationOperator: string | null = null
    let concentrationText: string | null = null

    if (concentrationAnswer?.number_value) {
      concentrationValue = concentrationAnswer.number_value
    } else if (concentrationAnswer?.text_value) {
      const parsed = parseConcentration(concentrationAnswer.text_value)
      concentrationValue = parsed.value
      concentrationOperator = parsed.operator
      concentrationText = concentrationAnswer.text_value
    }

    // Get unit for this row (could be text_value or choice)
    const { data: unitAnswer } = await supabase
      .from('answers')
      .select('text_value, choice_id, choices(content)')
      .eq('sheet_id', parsedAnswer.sheet_id)
      .eq('list_table_row_id', parsedAnswer.list_table_row_id)
      .eq('list_table_column_id', UNIT_COLUMN_ID)
      .maybeSingle()

    let unit = unitAnswer?.text_value || (unitAnswer?.choices as any)?.content || null

    // If no unit found, try to extract from concentration text
    if (!unit && concentrationText) {
      const parsed = parseConcentration(concentrationText)
      unit = parsed.unit
    }

    // Normalize concentration to percentage if possible
    const normalizedConcentration = normalizeConcentration(concentrationValue, unit)

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('sheet_chemicals')
      .select('id')
      .eq('sheet_id', parsedAnswer.sheet_id)
      .eq('chemical_id', chemical.id)
      .eq('list_table_row_id', parsedAnswer.list_table_row_id)
      .maybeSingle()

    if (existingLink) {
      continue // Skip if already linked
    }

    // Build concentration string with operator if present
    let concentrationWithOperator = null
    if (concentrationValue !== null) {
      if (concentrationOperator) {
        concentrationWithOperator = `${concentrationOperator} ${concentrationValue}`
      } else {
        concentrationWithOperator = concentrationValue.toString()
      }
    }

    // Insert sheet_chemical link
    const { error: linkError } = await supabase
      .from('sheet_chemicals')
      .insert({
        sheet_id: parsedAnswer.sheet_id,
        chemical_id: chemical.id,
        concentration: normalizedConcentration || concentrationValue,
        concentration_unit: unit || '%',
        list_table_row_id: parsedAnswer.list_table_row_id,
        answer_id: parsedAnswer.id,
      })

    if (linkError) {
      console.log(`  ✗ Error linking ${cas}: ${linkError.message}`)
      linkFailed++
    } else {
      linked++
    }
  }

  console.log(`\n✅ Linked ${linked} chemicals to sheets`)
  if (linkFailed > 0) {
    console.log(`   ${linkFailed} links failed\n`)
  }

  // Step 5: Summary Statistics
  console.log('\n' + '='.repeat(80))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(80) + '\n')

  const { count: totalChemicals } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })

  const { count: pfasCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_pfas', true)

  const { count: reachCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_reach_svhc', true)

  const { count: prop65Count } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_prop65', true)

  const { count: highRiskCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('risk_level', 'high')

  const { count: totalLinks } = await supabase
    .from('sheet_chemicals')
    .select('*', { count: 'exact', head: true })

  const { data: sheetsWithChemicals } = await supabase
    .from('sheet_chemicals')
    .select('sheet_id')

  const uniqueSheets = new Set(sheetsWithChemicals?.map(s => s.sheet_id) || []).size

  console.log(`Total chemicals in inventory: ${totalChemicals}`)
  console.log(`  PFAS substances: ${pfasCount}`)
  console.log(`  REACH SVHC: ${reachCount}`)
  console.log(`  Prop 65: ${prop65Count}`)
  console.log(`  High risk: ${highRiskCount}`)
  console.log(`\nTotal sheet-chemical links: ${totalLinks}`)
  console.log(`Sheets with chemicals: ${uniqueSheets}`)
  console.log('\n✅ Migration complete!')
  console.log('\nNext steps:')
  console.log('  1. Review high-risk chemicals in Supabase dashboard')
  console.log('  2. Build compliance dashboards to display this data')
  console.log('  3. Test with sample queries\n')
}

migrateCASNumbers().catch(console.error)

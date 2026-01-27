import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// EU REACH SVHC List (Candidate List - updated regularly)
// Source: https://echa.europa.eu/candidate-list-table
const REACH_SVHC_CAS: string[] = [
  '50-00-0',    // Formaldehyde
  '111-30-8',   // Glutaraldehyde
  '10108-64-2', // Cadmium chloride
  '1303-96-4',  // Sodium tetraborate, decahydrate (Borax)
  '1344-37-2',  // Lead sulfochromate yellow
  '7439-92-1',  // Lead
  '7784-40-9',  // Lead hydrogen arsenate
  '108-31-6',   // Maleic anhydride
  '117-81-7',   // Bis(2-ethylhexyl) phthalate (DEHP)
  '84-74-2',    // Dibutyl phthalate (DBP)
  '85-68-7',    // Butyl benzyl phthalate (BBP)
  '117-82-8',   // Bis(2-methoxyethyl) phthalate
  '56-35-9',    // Bis(tributyltin) oxide (TBTO)
  '36437-37-3', // 2-(2H-benzotriazol-2-yl)-4,6-ditertpentylphenol (UV-328)
  '25973-55-1', // 2-ethylhexyl 10-ethyl-4,4-dioctyl-7-oxo-8-oxa-3,5-dithia-4-stannatetradecanoate (DOTE)
  '93925-08-5', // 2-benzyl-2-dimethylamino-4'-morpholinobutyrophenone
  // Add more as needed - there are ~240 total
]

// California Prop 65 List
// Source: https://oehha.ca.gov/proposition-65/proposition-65-list
const PROP_65_CAS: string[] = [
  '50-00-0',    // Formaldehyde
  '75-07-0',    // Acetaldehyde
  '107-13-1',   // Acrylonitrile
  '71-43-2',    // Benzene
  '106-99-0',   // 1,3-Butadiene
  '75-01-4',    // Vinyl chloride
  '67-66-3',    // Chloroform
  '106-46-7',   // 1,4-Dichlorobenzene
  '117-81-7',   // DEHP
  '84-74-2',    // DBP
  '85-68-7',    // BBP
  '7439-92-1',  // Lead
  '7440-02-0',  // Nickel
  '7440-43-9',  // Cadmium
  '7440-47-3',  // Chromium
  '108-95-2',   // Phenol
  '90-43-7',    // 2-Phenylphenol (o-Phenylphenol)
  // Add more as needed - there are ~900 total
]

// PFAS chemicals (Per- and polyfluoroalkyl substances)
// These contain C-F bonds and are "forever chemicals"
const PFAS_CAS: string[] = [
  '335-67-1',   // PFOA (Perfluorooctanoic acid)
  '1763-23-1',  // PFOS (Perfluorooctane sulfonic acid)
  '375-95-1',   // PFNA (Perfluorononanoic acid)
  '72629-94-8', // PFHxS (Perfluorohexane sulfonic acid)
  '3825-26-1',  // PFHxA (Perfluorohexanoic acid)
  '335-76-2',   // PFPeA (Perfluoropentanoic acid)
  '2058-94-8',  // PFBS (Perfluorobutane sulfonic acid)
  '375-73-5',   // PFBA (Perfluorobutanoic acid)
]

// Food contact restricted substances
const FOOD_CONTACT_RESTRICTED_CAS: string[] = [
  '50-00-0',    // Formaldehyde - migration testing required
  '80-05-7',    // Bisphenol A (BPA)
  '117-81-7',   // DEHP
  '84-74-2',    // DBP
  '85-68-7',    // BBP
  ...PFAS_CAS,  // All PFAS are restricted in food contact
]

// Formaldehyde releasers (biocides that release formaldehyde)
const FORMALDEHYDE_RELEASERS: string[] = [
  '52-51-7',    // Bronopol (2-bromo-2-nitropropane-1,3-diol)
  '6440-58-0',  // Diazolidinyl urea
  '39236-46-9', // Imidazolidinyl urea
  '4080-31-3',  // Quaternium-15
  '55965-84-9', // Sodium hydroxymethylglycinate
  '78491-02-8', // DMDM hydantoin
]

interface ChemicalUpdate {
  id: string
  cas_number: string
  chemical_name: string
  updates: {
    is_pfas?: boolean
    is_reach_svhc?: boolean
    is_prop65?: boolean
    is_food_contact_restricted?: boolean
    risk_level?: 'high' | 'medium' | 'low'
    warnings?: string[]
    restrictions?: string[]
  }
}

async function enrichChemicals() {
  console.log('\n🔬 Chemical Regulatory Enrichment\n')
  console.log('='.repeat(60))

  // Get all chemicals
  const { data: chemicals, error } = await supabase
    .from('chemical_inventory')
    .select('id, cas_number, chemical_name, molecular_formula')

  if (error) {
    console.error('Error fetching chemicals:', error)
    return
  }

  console.log(`\nProcessing ${chemicals.length} chemicals...\n`)

  const updates: ChemicalUpdate[] = []

  for (const chemical of chemicals) {
    const cas = chemical.cas_number
    const update: ChemicalUpdate = {
      id: chemical.id,
      cas_number: cas,
      chemical_name: chemical.chemical_name || 'Unknown',
      updates: {
        warnings: [],
        restrictions: [],
      },
    }

    // Check PFAS
    if (PFAS_CAS.includes(cas) || isPFASByFormula(chemical.molecular_formula)) {
      update.updates.is_pfas = true
      update.updates.warnings!.push('PFAS - Per- and polyfluoroalkyl substance (forever chemical)')
      update.updates.restrictions!.push('EU PFAS restriction pending 2026')
    }

    // Check REACH SVHC
    if (REACH_SVHC_CAS.includes(cas)) {
      update.updates.is_reach_svhc = true
      update.updates.warnings!.push('REACH SVHC - Substance of Very High Concern')
      update.updates.restrictions!.push('EU authorization required for certain uses')
    }

    // Check Prop 65
    if (PROP_65_CAS.includes(cas)) {
      update.updates.is_prop65 = true
      update.updates.warnings!.push('California Prop 65 - Known to cause cancer or reproductive harm')
      update.updates.restrictions!.push('Warning label required in California')
    }

    // Check food contact
    if (FOOD_CONTACT_RESTRICTED_CAS.includes(cas)) {
      update.updates.is_food_contact_restricted = true
      update.updates.restrictions!.push('Migration testing required for food contact materials')
    }

    // Check formaldehyde releasers
    if (FORMALDEHYDE_RELEASERS.includes(cas)) {
      update.updates.warnings!.push('Formaldehyde releaser - may decompose to formaldehyde')
      update.updates.restrictions!.push('BfR recommendation: limit use in food contact materials')
    }

    // Calculate risk level
    if (update.updates.is_reach_svhc || update.updates.is_prop65 || update.updates.is_pfas) {
      update.updates.risk_level = 'high'
    } else if (FORMALDEHYDE_RELEASERS.includes(cas)) {
      update.updates.risk_level = 'medium'
    } else {
      update.updates.risk_level = 'low'
    }

    // Only add to updates if there are actual changes
    if (
      update.updates.is_pfas ||
      update.updates.is_reach_svhc ||
      update.updates.is_prop65 ||
      update.updates.is_food_contact_restricted ||
      update.updates.risk_level !== 'low'
    ) {
      updates.push(update)
    }
  }

  console.log(`\nFound ${updates.length} chemicals with regulatory flags:\n`)

  // Update database
  let successCount = 0
  let errorCount = 0

  for (const update of updates) {
    const { error } = await supabase
      .from('chemical_inventory')
      .update({
        is_pfas: update.updates.is_pfas || false,
        is_reach_svhc: update.updates.is_reach_svhc || false,
        is_prop65: update.updates.is_prop65 || false,
        is_food_contact_restricted: update.updates.is_food_contact_restricted || false,
        risk_level: update.updates.risk_level,
        warnings: update.updates.warnings,
        restrictions: update.updates.restrictions,
        last_updated: new Date().toISOString(),
      })
      .eq('id', update.id)

    if (error) {
      console.error(`❌ Error updating ${update.chemical_name}:`, error)
      errorCount++
    } else {
      const flags = []
      if (update.updates.is_pfas) flags.push('PFAS')
      if (update.updates.is_reach_svhc) flags.push('REACH')
      if (update.updates.is_prop65) flags.push('Prop65')
      if (update.updates.risk_level === 'high') flags.push('HIGH RISK')
      if (update.updates.risk_level === 'medium') flags.push('MEDIUM RISK')

      console.log(`✅ ${update.chemical_name} (${update.cas_number}): ${flags.join(', ')}`)
      successCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Updated: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)

  // Show summary stats
  console.log('\n📊 Summary Statistics:\n')

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

  const { count: mediumRiskCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('risk_level', 'medium')

  console.log(`  PFAS: ${pfasCount}`)
  console.log(`  REACH SVHC: ${reachCount}`)
  console.log(`  Prop 65: ${prop65Count}`)
  console.log(`  High Risk: ${highRiskCount}`)
  console.log(`  Medium Risk: ${mediumRiskCount}`)
  console.log()
}

// Helper function to detect PFAS by molecular formula
function isPFASByFormula(formula: string | null): boolean {
  if (!formula) return false

  // PFAS chemicals contain fluorine (F) and carbon (C)
  // Basic heuristic: contains both C and F, and has multiple F atoms
  const hasCarbon = formula.includes('C')
  const hasFluorine = formula.includes('F')

  if (!hasCarbon || !hasFluorine) return false

  // Extract F count (e.g., "C8HF15O2" -> 15)
  const fMatch = formula.match(/F(\d+)?/)
  if (!fMatch) return false

  const fCount = fMatch[1] ? parseInt(fMatch[1]) : 1

  // PFAS typically have multiple fluorine atoms (at least 2-3)
  return fCount >= 2
}

enrichChemicals().catch(console.error)

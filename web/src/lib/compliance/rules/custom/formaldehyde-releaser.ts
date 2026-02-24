import type { ChemicalInput, ComplianceResult, RegulatoryRule, TriggeredBy } from '../../types'

// Known formaldehyde releasers — biocides that decompose to release formaldehyde
const FORMALDEHYDE_RELEASERS = new Set([
  '52-51-7',    // Bronopol (2-bromo-2-nitropropane-1,3-diol)
  '6440-58-0',  // Diazolidinyl urea
  '39236-46-9', // Imidazolidinyl urea
  '4080-31-3',  // Quaternium-15
  '55965-84-9', // Sodium hydroxymethylglycinate
  '78491-02-8', // DMDM hydantoin
])

// Formaldehyde itself
const FORMALDEHYDE_CAS = '50-00-0'

// BfR recommended migration limit for formaldehyde in food contact materials
const BFR_FORMALDEHYDE_MIGRATION_LIMIT_MG_KG = 15 // mg/kg

export function evaluateFormaldehydeReleaser(
  chemicals: ChemicalInput[],
  rule: RegulatoryRule,
): ComplianceResult {
  const triggered: TriggeredBy[] = []

  // Check for formaldehyde itself
  const formaldehyde = chemicals.find(c => c.cas_number === FORMALDEHYDE_CAS)
  if (formaldehyde) {
    triggered.push({
      cas_number: formaldehyde.cas_number,
      chemical_name: formaldehyde.chemical_name,
      reason: 'Direct formaldehyde presence — BfR migration limit: 15 mg/kg',
      concentration_pct: formaldehyde.concentration_pct ?? formaldehyde.concentration_max_pct,
    })
  }

  // Check for formaldehyde releasers
  for (const chem of chemicals) {
    if (FORMALDEHYDE_RELEASERS.has(chem.cas_number)) {
      triggered.push({
        cas_number: chem.cas_number,
        chemical_name: chem.chemical_name,
        reason: 'Formaldehyde releaser — may decompose to release formaldehyde above BfR limits',
        concentration_pct: chem.concentration_pct ?? chem.concentration_max_pct,
      })
    }
  }

  if (triggered.length === 0) {
    return {
      rule_id: rule.id,
      framework_id: rule.framework_id,
      status: 'pass',
      triggered_by: [],
      message: 'No formaldehyde or formaldehyde releasers detected.',
    }
  }

  const hasDirectFormaldehyde = triggered.some(t => t.cas_number === FORMALDEHYDE_CAS)
  const status = hasDirectFormaldehyde ? 'fail' : 'warning'
  const names = triggered.map(t => t.chemical_name).join(', ')

  return {
    rule_id: rule.id,
    framework_id: rule.framework_id,
    status,
    triggered_by: triggered,
    message: hasDirectFormaldehyde
      ? `Formaldehyde detected. BfR Rec. XXXVI migration limit: ${BFR_FORMALDEHYDE_MIGRATION_LIMIT_MG_KG} mg/kg. Substances: ${names}`
      : `Formaldehyde releasers detected: ${names}. Migration testing recommended per BfR Rec. XXXVI.`,
  }
}

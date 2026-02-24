import type { ChemicalInput, ConcentrationThresholdConfig, ComplianceResult, RegulatoryRule, TriggeredBy } from '../types'

export function evaluateConcentrationThreshold(
  chemicals: ChemicalInput[],
  rule: RegulatoryRule,
): ComplianceResult {
  const config = rule.rule_config as ConcentrationThresholdConfig
  const triggered: TriggeredBy[] = []
  let hasInsufficientData = false

  // If applies_to is specified, only check those CAS numbers
  const targetChemicals = config.applies_to && config.applies_to.length > 0
    ? chemicals.filter(c => config.applies_to!.includes(c.cas_number))
    : chemicals

  for (const chem of targetChemicals) {
    const concentration = chem.concentration_pct ?? chem.concentration_max_pct

    if (concentration === null || concentration === undefined) {
      hasInsufficientData = true
      continue
    }

    let exceeds = false
    switch (config.operator) {
      case '>':
        exceeds = concentration > config.threshold_pct
        break
      case '>=':
        exceeds = concentration >= config.threshold_pct
        break
      case '<':
        exceeds = concentration < config.threshold_pct
        break
      case '<=':
        exceeds = concentration <= config.threshold_pct
        break
    }

    if (exceeds) {
      triggered.push({
        cas_number: chem.cas_number,
        chemical_name: chem.chemical_name,
        reason: `Concentration ${concentration}% ${config.operator} ${config.threshold_pct}% threshold`,
        concentration_pct: concentration,
      })
    }
  }

  if (triggered.length === 0 && hasInsufficientData && targetChemicals.length > 0) {
    return {
      rule_id: rule.id,
      framework_id: rule.framework_id,
      status: 'insufficient_data',
      triggered_by: [],
      message: 'Concentration data missing for one or more chemicals — cannot fully evaluate threshold.',
    }
  }

  if (triggered.length === 0) {
    return {
      rule_id: rule.id,
      framework_id: rule.framework_id,
      status: 'pass',
      triggered_by: [],
      message: rule.message_template
        .replace('{status}', 'All concentrations within limits')
        .replace('{threshold}', `${config.threshold_pct}%`),
    }
  }

  const status = rule.severity === 'warning' ? 'warning' : 'fail'
  const names = triggered.map(t => `${t.chemical_name} (${t.concentration_pct}%)`).join(', ')

  return {
    rule_id: rule.id,
    framework_id: rule.framework_id,
    status,
    triggered_by: triggered,
    message: rule.message_template
      .replace('{status}', `${triggered.length} substance(s) exceed threshold`)
      .replace('{chemicals}', names)
      .replace('{threshold}', `${config.threshold_pct}%`)
      .replace('{count}', String(triggered.length)),
  }
}

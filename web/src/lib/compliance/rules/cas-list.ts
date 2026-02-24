import type { ChemicalInput, CasListConfig, ComplianceResult, RegulatoryRule, TriggeredBy } from '../types'

export function evaluateCasList(
  chemicals: ChemicalInput[],
  rule: RegulatoryRule,
): ComplianceResult {
  const config = rule.rule_config as CasListConfig
  const casSet = new Set(config.cas_numbers)
  const triggered: TriggeredBy[] = []

  for (const chem of chemicals) {
    if (casSet.has(chem.cas_number)) {
      triggered.push({
        cas_number: chem.cas_number,
        chemical_name: chem.chemical_name,
        reason: `Found on ${config.list_name}`,
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
      message: rule.message_template
        .replace('{status}', 'No substances found')
        .replace('{list_name}', config.list_name),
    }
  }

  const status = rule.severity === 'warning' ? 'warning' : 'fail'
  const names = triggered.map(t => t.chemical_name).join(', ')

  return {
    rule_id: rule.id,
    framework_id: rule.framework_id,
    status,
    triggered_by: triggered,
    message: rule.message_template
      .replace('{status}', `${triggered.length} substance(s) found`)
      .replace('{chemicals}', names)
      .replace('{list_name}', config.list_name)
      .replace('{count}', String(triggered.length)),
  }
}

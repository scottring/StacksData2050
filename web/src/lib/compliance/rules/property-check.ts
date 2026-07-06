import type { ChemicalInput, PropertyCheckConfig, ComplianceResult, RegulatoryRule, TriggeredBy } from '../types'

export function evaluatePropertyCheck(
  chemicals: ChemicalInput[],
  rule: RegulatoryRule,
): ComplianceResult {
  const config = rule.rule_config as PropertyCheckConfig
  const triggered: TriggeredBy[] = []

  for (const chem of chemicals) {
    const value = chem[config.property as keyof ChemicalInput]

    if (value === config.expected_value) {
      triggered.push({
        cas_number: chem.cas_number,
        chemical_name: chem.chemical_name,
        reason: `${config.property} = ${config.expected_value}`,
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
        .replace('{status}', 'No matching substances found')
        .replace('{property}', config.property),
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
      .replace('{status}', `${triggered.length} substance(s) flagged`)
      .replace('{chemicals}', names)
      .replace('{count}', String(triggered.length)),
  }
}

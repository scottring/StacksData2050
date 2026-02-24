import type {
  ChemicalInput,
  RegulatoryRule,
  ComplianceResult,
  AssessmentSummary,
  FrameworkWithRules,
} from './types'
import { evaluateCasList } from './rules/cas-list'
import { evaluateConcentrationThreshold } from './rules/concentration-threshold'
import { evaluatePropertyCheck } from './rules/property-check'
import { evaluateFormaldehydeReleaser } from './rules/custom/formaldehyde-releaser'

// Registry of custom evaluators
const CUSTOM_EVALUATORS: Record<
  string,
  (chemicals: ChemicalInput[], rule: RegulatoryRule) => ComplianceResult
> = {
  formaldehyde_releaser: evaluateFormaldehydeReleaser,
}

/**
 * Evaluate a single rule against a set of chemicals.
 */
export function evaluateRule(
  chemicals: ChemicalInput[],
  rule: RegulatoryRule,
): ComplianceResult {
  if (chemicals.length === 0) {
    return {
      rule_id: rule.id,
      framework_id: rule.framework_id,
      status: 'not_applicable',
      triggered_by: [],
      message: 'No chemicals provided for evaluation.',
    }
  }

  switch (rule.rule_type) {
    case 'cas_list':
      return evaluateCasList(chemicals, rule)

    case 'concentration_threshold':
      return evaluateConcentrationThreshold(chemicals, rule)

    case 'property_check':
      return evaluatePropertyCheck(chemicals, rule)

    case 'custom': {
      const config = rule.rule_config as { type: 'custom'; evaluator: string }
      const evaluator = CUSTOM_EVALUATORS[config.evaluator]
      if (!evaluator) {
        return {
          rule_id: rule.id,
          framework_id: rule.framework_id,
          status: 'not_applicable',
          triggered_by: [],
          message: `Unknown custom evaluator: ${config.evaluator}`,
        }
      }
      return evaluator(chemicals, rule)
    }

    default:
      return {
        rule_id: rule.id,
        framework_id: rule.framework_id,
        status: 'not_applicable',
        triggered_by: [],
        message: `Unknown rule type: ${rule.rule_type}`,
      }
  }
}

/**
 * Evaluate all rules across all frameworks for a set of chemicals.
 * Returns a complete assessment summary.
 */
export function evaluateAssessment(
  chemicals: ChemicalInput[],
  frameworks: FrameworkWithRules[],
): AssessmentSummary {
  const results: ComplianceResult[] = []

  for (const framework of frameworks) {
    for (const rule of framework.rules) {
      const result = evaluateRule(chemicals, rule)
      results.push(result)
    }
  }

  const rulesFailed = results.filter(r => r.status === 'fail').length
  const rulesWarning = results.filter(r => r.status === 'warning').length
  const rulesPassed = results.filter(r => r.status === 'pass').length
  const totalEvaluated = results.filter(r => r.status !== 'not_applicable').length

  let overallStatus: AssessmentSummary['overall_status'] = 'pass'
  if (rulesFailed > 0) overallStatus = 'fail'
  else if (rulesWarning > 0) overallStatus = 'warning'

  return {
    overall_status: overallStatus,
    total_rules_evaluated: totalEvaluated,
    rules_passed: rulesPassed,
    rules_failed: rulesFailed,
    rules_warning: rulesWarning,
    results,
  }
}

/**
 * Group results by framework for UI display.
 */
export function groupResultsByFramework(
  results: ComplianceResult[],
  frameworks: FrameworkWithRules[],
): Record<string, { framework: FrameworkWithRules; results: ComplianceResult[]; status: 'pass' | 'fail' | 'warning' }> {
  const grouped: Record<string, { framework: FrameworkWithRules; results: ComplianceResult[]; status: 'pass' | 'fail' | 'warning' }> = {}

  for (const fw of frameworks) {
    const fwResults = results.filter(r => r.framework_id === fw.id)
    const hasFail = fwResults.some(r => r.status === 'fail')
    const hasWarning = fwResults.some(r => r.status === 'warning')

    grouped[fw.code] = {
      framework: fw,
      results: fwResults,
      status: hasFail ? 'fail' : hasWarning ? 'warning' : 'pass',
    }
  }

  return grouped
}

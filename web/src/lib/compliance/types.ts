// Core types for the compliance rules engine

export interface ChemicalInput {
  id?: string
  cas_number: string
  chemical_name: string
  concentration_pct?: number | null
  concentration_min_pct?: number | null
  concentration_max_pct?: number | null
  function_in_product?: string | null
  molecular_formula?: string | null
  is_pfas?: boolean
  is_reach_svhc?: boolean
  is_prop65?: boolean
  is_food_contact_restricted?: boolean
}

export type RuleType = 'cas_list' | 'concentration_threshold' | 'property_check' | 'custom'
export type Severity = 'block' | 'fail' | 'warning' | 'info'
export type ResultStatus = 'pass' | 'fail' | 'warning' | 'not_applicable' | 'insufficient_data'

export interface RegulatoryRule {
  id: string
  framework_id: string
  code: string
  name: string
  category: string
  rule_type: RuleType
  rule_config: RuleConfig
  severity: Severity
  message_template: string
  remediation_text: string | null
}

export interface CasListConfig {
  type: 'cas_list'
  cas_numbers: string[]
  list_name: string
}

export interface ConcentrationThresholdConfig {
  type: 'concentration_threshold'
  threshold_pct: number
  operator: '>' | '>=' | '<' | '<='
  applies_to?: string[] // CAS numbers this threshold applies to, empty = all
  list_name?: string
}

export interface PropertyCheckConfig {
  type: 'property_check'
  property: string // key on ChemicalInput, e.g. 'is_pfas'
  expected_value: boolean | string | number
}

export interface CustomRuleConfig {
  type: 'custom'
  evaluator: string // name of custom evaluator function
  params?: Record<string, unknown>
}

export type RuleConfig =
  | CasListConfig
  | ConcentrationThresholdConfig
  | PropertyCheckConfig
  | CustomRuleConfig

export interface ComplianceResult {
  rule_id: string
  framework_id: string
  status: ResultStatus
  triggered_by: TriggeredBy[]
  message: string
}

export interface TriggeredBy {
  cas_number: string
  chemical_name: string
  reason: string
  concentration_pct?: number | null
}

export interface AssessmentSummary {
  overall_status: 'pass' | 'fail' | 'warning' | 'pending'
  total_rules_evaluated: number
  rules_passed: number
  rules_failed: number
  rules_warning: number
  results: ComplianceResult[]
}

export interface FrameworkWithRules {
  id: string
  code: string
  name: string
  jurisdiction: string
  rules: RegulatoryRule[]
}

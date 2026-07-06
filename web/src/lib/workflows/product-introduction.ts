// Product Introduction Workflow — shared constants, types, and helpers.
//
// Source of truth for the enums declared as CHECK constraints in
// 20260421000002_product_introduction_workflow.sql. Keep in sync.

export const WORKFLOW_ROLES = [
  'requestor',
  'operator',
  'procurement',
  'incident_officer',
  'water_protection',
  'pqm',
  'security_specialist',
  'head_procurement',
  'operator_brk',
  'fire_protection',
] as const
export type WorkflowRole = (typeof WORKFLOW_ROLES)[number]

export const WORKFLOW_STATUSES = [
  'draft',
  'submitted',
  'triage',
  'in_review',
  'approved',
  'returned',
  'rejected',
] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export const STEP_DECISIONS = ['pending', 'approved', 'returned', 'skipped'] as const
export type StepDecision = (typeof STEP_DECISIONS)[number]

export const CONDITION_CATEGORIES = [
  'emission',
  'wastewater',
  'storage',
  'osh',
  'fire',
  'wastewater_treatment',
  'other',
] as const
export type ConditionCategory = (typeof CONDITION_CATEGORIES)[number]

// Default sequential order for the review pipeline. The requestor and
// operator sign before the workflow enters in_review (handled during
// draft/submit), so they are not part of the review sequence.
//
// In a later pass, per-plant customization will override this order via
// admin config. For V1 all plants use this default.
export const DEFAULT_REVIEW_STEP_ORDER: WorkflowRole[] = [
  'procurement',
  'incident_officer',
  'water_protection',
  'pqm',
  'security_specialist',
  'head_procurement',
  'operator_brk',
  'fire_protection',
]

// Fields on the Product Sheet / workflow metadata each role is allowed to
// edit. Used by the UI to toggle field editability at each step, and
// (in a later migration) by DB triggers to enforce field ownership.
export const ROLE_OWNED_FIELDS: Record<WorkflowRole, string[]> = {
  requestor: [
    'requesting_department',
    'asi_identification_number',
    'date_of_introduction',
    'purpose_of_use',
    'aim_of_introduction',
    'mission',
    'location',
    'volume_number',
    'storage_location',
    'storage_type',
    'packaging',
    'product_group',
    'rating_class',
    'product_hierarchy',
    'material_allocation',
  ],
  operator: [],
  procurement: ['mat_no_ek'],
  incident_officer: ['incident_ordinance_relevant'],
  water_protection: ['vaws_cadastre_no', 'wgk_class'],
  pqm: ['system_compatibility_checked', 'product_questionnaire_included'],
  security_specialist: [
    'hazardous_substance_substitute_tested',
    'gefstoffv_hazardous',
  ],
  head_procurement: [],
  operator_brk: [],
  fire_protection: [],
}

// Allowed transitions. Any transition not listed is rejected by the API.
export const STATUS_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ['submitted'],
  submitted: ['triage'],
  triage: ['in_review', 'returned', 'rejected'],
  in_review: ['approved', 'returned', 'rejected'],
  approved: [],
  returned: ['draft'],
  rejected: [],
}

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function isWorkflowRole(value: unknown): value is WorkflowRole {
  return typeof value === 'string' && (WORKFLOW_ROLES as readonly string[]).includes(value)
}

export function isConditionCategory(value: unknown): value is ConditionCategory {
  return (
    typeof value === 'string' &&
    (CONDITION_CATEGORIES as readonly string[]).includes(value)
  )
}

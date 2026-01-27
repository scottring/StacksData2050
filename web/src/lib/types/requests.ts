/**
 * Request System Types
 * Based on stacks2030 request tracking patterns
 */

// ============================================================================
// REQUEST STATUS
// ============================================================================

export type RequestStatus =
  | 'Created'    // Initial state - request just created
  | 'Reviewed'   // Customer has reviewed, awaiting supplier response
  | 'Responded'  // Supplier has responded
  | 'Approved'   // Request completed successfully
  | 'Flagged'    // Request needs attention
  | 'Answered'   // Alternative completion state

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  Created: 'Created',
  Reviewed: 'Under Review',
  Responded: 'Responded',
  Approved: 'Approved',
  Flagged: 'Flagged',
  Answered: 'Completed',
}

export const REQUEST_STATUS_COLORS: Record<RequestStatus, { bg: string, text: string }> = {
  Created: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Reviewed: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Responded: { bg: 'bg-purple-100', text: 'text-purple-800' },
  Approved: { bg: 'bg-green-100', text: 'text-green-800' },
  Flagged: { bg: 'bg-red-100', text: 'text-red-800' },
  Answered: { bg: 'bg-green-100', text: 'text-green-800' },
}

// ============================================================================
// CORE TYPES
// ============================================================================

export interface Request {
  id: string
  sheet_id: string | null
  owner_company_id: string  // Company creating the request (customer/manufacturer)
  reader_company_id: string // Company receiving the request (supplier)
  status: RequestStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RequestTag {
  id: string
  request_id: string
  tag_id: string
  created_at: string
}

export interface Invite {
  id: string
  request_id: string | null
  email: string
  company_name: string | null
  sent_at: string | null
  accepted_at: string | null
  created_by: string | null
  created_at: string
}

// ============================================================================
// USER ROLES & PERMISSIONS
// ============================================================================

export type CompanyRole =
  | 'company_admin' // Full company access
  | 'manager'       // Manage requests, responses, team
  | 'contributor'   // Create requests, respond
  | 'viewer'        // Read-only

export type Permission =
  // User Management
  | 'manage_users'
  | 'invite_users'
  | 'remove_users'
  | 'assign_roles'

  // Request Management
  | 'create_requests'
  | 'approve_requests'
  | 'delete_requests'
  | 'view_all_requests'

  // Response Management
  | 'respond_to_requests'
  | 'review_responses'
  | 'delete_responses'

  // Company Management
  | 'manage_company'
  | 'manage_billing'
  | 'manage_integrations'
  | 'manage_security_settings'

  // Analytics & Reporting
  | 'view_analytics'
  | 'view_advanced_analytics'
  | 'export_data'
  | 'view_audit_logs'

  // Tag Management
  | 'manage_tags'
  | 'use_premium_tags'
  | 'assign_tag_permissions'

  // Sheet Management
  | 'create_sheets'
  | 'edit_sheets'
  | 'delete_sheets'
  | 'manage_sheet_permissions'

  // API Access
  | 'generate_api_keys'
  | 'manage_api_access'
  | 'view_api_usage'

export interface UserRole {
  id: string
  user_id: string
  company_id: string
  role: CompanyRole
  permissions: Permission[]
  assigned_by: string | null
  assigned_at: string
  is_active: boolean
}

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export interface RoleDefinition {
  name: string
  description: string
  permissions: Permission[]
  canManageRoles: boolean
  hierarchy: number // Higher = more permissions
}

export const COMPANY_ROLE_DEFINITIONS: Record<CompanyRole, RoleDefinition> = {
  company_admin: {
    name: 'Company Administrator',
    description: 'Full access to all company features and settings',
    hierarchy: 100,
    canManageRoles: true,
    permissions: [
      'manage_users', 'invite_users', 'remove_users', 'assign_roles',
      'create_requests', 'approve_requests', 'delete_requests', 'view_all_requests',
      'respond_to_requests', 'review_responses', 'delete_responses',
      'manage_company', 'manage_billing', 'manage_integrations', 'manage_security_settings',
      'view_analytics', 'view_advanced_analytics', 'export_data', 'view_audit_logs',
      'manage_tags', 'use_premium_tags', 'assign_tag_permissions',
      'create_sheets', 'edit_sheets', 'delete_sheets', 'manage_sheet_permissions',
      'generate_api_keys', 'manage_api_access', 'view_api_usage',
    ],
  },
  manager: {
    name: 'Manager',
    description: 'Can manage requests, responses, and team members',
    hierarchy: 75,
    canManageRoles: false,
    permissions: [
      'invite_users',
      'create_requests', 'approve_requests', 'view_all_requests',
      'respond_to_requests', 'review_responses',
      'view_analytics', 'export_data',
      'manage_tags', 'use_premium_tags',
      'create_sheets', 'edit_sheets', 'manage_sheet_permissions',
    ],
  },
  contributor: {
    name: 'Contributor',
    description: 'Can create requests and respond to questionnaires',
    hierarchy: 50,
    canManageRoles: false,
    permissions: [
      'create_requests',
      'respond_to_requests',
      'view_analytics',
      'use_premium_tags',
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to assigned content',
    hierarchy: 25,
    canManageRoles: false,
    permissions: ['view_analytics'],
  },
}

// ============================================================================
// EXTENDED TYPES WITH RELATIONSHIPS
// ============================================================================

export interface RequestWithRelations extends Request {
  owner_company?: {
    id: string
    name: string
  }
  reader_company?: {
    id: string
    name: string
  }
  sheet?: {
    id: string
    name: string
  }
  created_by_user?: {
    id: string
    full_name: string
    email: string
  }
  tags?: Array<{
    id: string
    name: string
  }>
  invite?: Invite
}

// ============================================================================
// INPUT TYPES FOR MUTATIONS
// ============================================================================

export interface CreateRequestInput {
  sheet_id?: string
  owner_company_id: string
  reader_company_id: string
  tag_ids: string[]
  notes?: string
}

export interface UpdateRequestStatusInput {
  request_id: string
  status: RequestStatus
  notes?: string
}

export interface CreateInviteInput {
  request_id?: string
  email: string
  company_name?: string
}

export interface AssignUserRoleInput {
  user_id: string
  company_id: string
  role: CompanyRole
  assigned_by: string
}

// ============================================================================
// FILTER & SORT TYPES
// ============================================================================

export interface RequestFilters {
  status?: RequestStatus | 'all'
  company_id?: string
  sheet_id?: string
  created_after?: string
  created_before?: string
  search?: string // Search in notes, sheet name, company name
}

export type RequestSortField =
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'owner_company_name'
  | 'reader_company_name'
  | 'sheet_name'

export interface RequestSort {
  field: RequestSortField
  direction: 'asc' | 'desc'
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface CompanyRequestStats {
  company_id: string
  company_name: string

  // Outgoing requests (as customer)
  pending_outgoing_requests: number
  approved_outgoing_requests: number
  total_outgoing_requests: number

  // Incoming requests (as supplier)
  pending_incoming_requests: number
  approved_incoming_requests: number
  total_incoming_requests: number

  // Averages
  avg_response_time_days?: number
  completion_rate?: number // approved / total
}

export interface DashboardRequestStats {
  // Customer requests (incoming - others requesting from us)
  pending_customer_requests: number
  completed_customer_requests: number
  total_customer_requests: number

  // Supplier requests (outgoing - we requesting from others)
  pending_supplier_requests: number
  completed_supplier_requests: number
  total_supplier_requests: number

  // Recent activity
  recent_requests: RequestWithRelations[]
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function isPendingStatus(status: RequestStatus): boolean {
  return status === 'Created' || status === 'Reviewed'
}

export function isCompletedStatus(status: RequestStatus): boolean {
  return status === 'Approved' || status === 'Answered'
}

export function getRequestStatusBadgeClasses(status: RequestStatus): string {
  const colors = REQUEST_STATUS_COLORS[status]
  return `${colors.bg} ${colors.text}`
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return userRole.is_active && userRole.permissions.includes(permission)
}

export function canManageUser(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  if (!managerRole.is_active) return false

  const managerDef = COMPANY_ROLE_DEFINITIONS[managerRole.role]
  const targetDef = COMPANY_ROLE_DEFINITIONS[targetRole.role]

  // Can only manage users in same company
  if (managerRole.company_id !== targetRole.company_id) return false

  // Must have role management permission and higher hierarchy
  return managerDef.canManageRoles && managerDef.hierarchy > targetDef.hierarchy
}

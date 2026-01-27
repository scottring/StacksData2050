// TODO: Create user_role enum in database, then import from database.types
type UserRole = 'admin' | 'editor' | 'reviewer' | 'viewer'

export type Permission =
  | 'view_sheets'
  | 'create_sheets'
  | 'edit_answers'
  | 'change_sheet_status'
  | 'manage_users'
  | 'manage_companies'
  | 'manage_questions'
  | 'manage_associations'
  | 'manage_stacks'
  | 'run_reports'

/**
 * Role-based permission matrix
 * Defines what each role can do in the system
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: ['view_sheets'],
  reviewer: ['view_sheets', 'change_sheet_status'],
  editor: [
    'view_sheets',
    'create_sheets',
    'edit_answers',
    'change_sheet_status',
  ],
  admin: [
    'view_sheets',
    'create_sheets',
    'edit_answers',
    'change_sheet_status',
    'manage_users',
    'manage_companies',
    'manage_questions',
    'manage_associations',
    'manage_stacks',
    'run_reports',
  ],
}

/**
 * Check if a user has a specific permission
 * Super admins always return true
 */
export function hasPermission(
  role: UserRole,
  permission: Permission,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Convenience functions for common permission checks
 */

export function canViewSheets(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'view_sheets', isSuperAdmin)
}

export function canCreateSheets(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'create_sheets', isSuperAdmin)
}

export function canEditAnswers(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'edit_answers', isSuperAdmin)
}

export function canChangeSheetStatus(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'change_sheet_status', isSuperAdmin)
}

export function canManageUsers(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'manage_users', isSuperAdmin)
}

export function canManageCompanies(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'manage_companies', isSuperAdmin)
}

export function canManageQuestions(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'manage_questions', isSuperAdmin)
}

export function canRunReports(
  role: UserRole,
  isSuperAdmin = false
): boolean {
  return hasPermission(role, 'run_reports', isSuperAdmin)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Get a human-readable display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrator',
    editor: 'Editor',
    reviewer: 'Reviewer',
    viewer: 'Viewer',
  }
  return names[role]
}

/**
 * Get a description of what a role can do
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full control: manage users, companies, questions, and all sheets',
    editor: 'Create and edit sheets, change answers and sheet status',
    reviewer: 'View sheets and approve/reject submissions',
    viewer: 'Read-only access to sheets and answers',
  }
  return descriptions[role]
}

/**
 * Type guard to check if a value is a valid UserRole
 */
export function isValidRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    ['admin', 'editor', 'reviewer', 'viewer'].includes(value)
  )
}

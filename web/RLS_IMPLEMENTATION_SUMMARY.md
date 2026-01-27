# RLS Implementation Summary

## What We've Built

### 1. Database Migrations ✅

**Phase 1: Role System** (`20260109000001_add_roles_system.sql`)
- Created `user_role` enum with 4 roles: admin, editor, reviewer, viewer
- Added `role` column to users table
- Added `is_super_admin` flag for platform owner
- Automatically mapped existing 11 permission flags → 4 roles
- Preserved old flags as `_deprecated_*` for safety
- Created helper functions: `auth.user_company_id()`, `auth.is_super_admin()`

**Phase 2: RLS Policies** (`20260109000002_enable_rls_policies.sql`)
- Created advanced helper functions:
  - `auth.user_association_ids()` - returns user's associations (both paths)
  - `auth.visible_company_ids()` - returns companies user can see
- Enabled RLS on: sheets, answers, companies, users
- Created comprehensive policies:
  - **Sheets**: Users see sheets where company is customer/supplier/shareable
  - **Answers**: Users see answers if they can access parent sheet
  - **Companies**: Users see own + association members + sheet relationships
  - **Users**: Users see users in visible companies
- Created `association_member_profiles` view for basic company profiles

### 2. Frontend Code ✅

**Permission System** (`src/lib/permissions.ts`)
- Central permission checking functions
- Role hierarchy: viewer < reviewer < editor < admin
- Convenience functions: `canEditAnswers()`, `canManageUsers()`, etc.
- Role display names and descriptions

**Middleware** (`src/middleware.ts`)
- Role-based route protection
- Blocks routes by minimum required role
- Super admin bypass
- Graceful handling of missing user data

**Updated Pages**
- **Suppliers Page** (`src/app/suppliers/page.tsx`):
  - Converted to server component
  - Uses RLS-filtered queries
  - Only shows association member suppliers
  - Extracted client interactivity to `SuppliersList` component

### 3. Documentation ✅

- **Deployment Guide** - Safe phased rollout strategy
- **Rollback Script** - Emergency disable + full rollback
- **Demo Plan** - Recommendations for Wednesday client demo

---

## Current State

### What Works Now (Without RLS Enabled)

The app currently works with the OLD permission system:
- 11 boolean flags on users table
- No row-level security
- Client-side filtering only

### What's Ready to Deploy

**Option A: Deploy Phase 1 Only (Recommended for Demo)**
- Adds role column to users
- App continues using old permission flags
- Non-breaking, can deploy anytime
- Shows "modernized permission system" if asked

**Option B: Full RLS Deployment (After Demo)**
- Deploy both Phase 1 and Phase 2
- Requires ALL frontend pages updated first
- Breaking change - must test thoroughly

---

## What Still Needs to Be Done

### Frontend Pages to Update for RLS

1. **Dashboard** (`src/app/dashboard/page.tsx`)
   - Convert to server component
   - Remove client-side sheet filtering
   - Trust RLS to filter accessible sheets

2. **Sheet Detail Page** (`src/app/sheets/[id]/page.tsx`)
   - Already server component (probably)
   - Verify RLS filtering works
   - Add permission checks for edit/review buttons

3. **Customers Page** (if it exists)
   - Similar to suppliers page
   - Show companies where user is the supplier

4. **Questions Management** (`src/app/questions/*`)
   - Admin-only access
   - Middleware already blocks non-admins

5. **User Management** (if it exists)
   - Admin-only access
   - RLS filters to visible users only

### Testing & Verification

1. **Create Test Script** (`scripts/verify-rls.ts`)
   - Test role assignment
   - Test RLS policies
   - Test association visibility
   - Test super admin access

2. **Manual Testing Checklist**
   - [ ] Viewer can see sheets but not edit
   - [ ] Editor can create and edit sheets
   - [ ] Reviewer can approve/reject
   - [ ] Admin can manage users
   - [ ] Super admin sees everything
   - [ ] Association members see each other
   - [ ] Non-members don't see private data

### Migration Steps (Production)

**Before Wednesday Demo:**
- Option 1: Deploy nothing (safest)
- Option 2: Deploy Phase 1 only (low risk)

**After Wednesday Demo:**
1. Finish updating remaining frontend pages
2. Test in staging environment
3. Create test users for each role
4. Run verification script
5. Deploy Phase 2 to production
6. Monitor closely for first hour
7. Have rollback script ready

---

## Risk Assessment

### Phase 1: LOW RISK ⚠️
- Non-breaking change
- Can deploy to production now
- Rollback: Drop 2 columns

### Phase 2: MODERATE RISK ⚠️⚠️
- Breaking change
- Requires frontend updates
- Emergency rollback: 4 SQL commands (1 second)
- Full rollback: Run ROLLBACK script (5 minutes)

### Wednesday Demo: ZERO RISK ⭐
- Don't deploy anything new before demo
- Show the clean migrated data
- Deploy RLS after demo success

---

## Key Benefits of This Approach

1. **Security at Database Level**
   - Can't bypass RLS from client code
   - Every query automatically filtered
   - No "oops I forgot to check permissions"

2. **Multi-Tenancy Built In**
   - Each company sees only their data
   - Association members see each other (PPVIS model)
   - Super admin sees everything for support

3. **Simplified Permission Model**
   - 4 clear roles instead of 11 boolean flags
   - Easy to understand and explain
   - Easy to extend in future

4. **Rollback Safety**
   - Old permission flags preserved
   - Emergency disable takes 1 second
   - Can revert completely if needed

---

## Files Created/Modified

### New Files
- `stacks/web/supabase/migrations/20260109000001_add_roles_system.sql`
- `stacks/web/supabase/migrations/20260109000002_enable_rls_policies.sql`
- `stacks/web/supabase/migrations/ROLLBACK_rls_if_needed.sql`
- `stacks/web/supabase/DEPLOYMENT_GUIDE.md`
- `stacks/web/supabase/DEMO_DEPLOYMENT_PLAN.md`
- `stacks/web/src/lib/permissions.ts`
- `stacks/web/src/components/suppliers/suppliers-list.tsx`

### Modified Files
- `stacks/web/src/middleware.ts` - Added role-based route protection
- `stacks/web/src/app/suppliers/page.tsx` - Converted to server component with RLS

---

## Next Steps

**Immediate (Today/Tomorrow):**
1. Update dashboard page to work with RLS
2. Update sheet detail page permission checks
3. Create verification test script

**Before Demo (Monday/Tuesday):**
1. Decide: Deploy Phase 1 or nothing?
2. Test thoroughly if deploying
3. Prepare demo talking points

**After Demo (Next Week):**
1. Deploy Phase 1 if not already done
2. Finish all frontend page updates
3. Test in staging with Phase 2
4. Deploy Phase 2 to production
5. Monitor and celebrate! 🎉

---

## Support & Troubleshooting

**If RLS breaks something:**
```sql
-- Emergency disable (run immediately):
ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Common Issues:**
- "No data visible" → Check user's `company_id` is set
- "Permission denied" → Check user's `role` field
- "Can't see association members" → Verify association membership setup
- "Slow queries" → RLS adds overhead, may need indexes

**Verification Queries:**
```sql
-- Check role distribution
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Check super admins
SELECT email, role, is_super_admin FROM users WHERE is_super_admin = true;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('sheets', 'answers', 'companies', 'users');
```

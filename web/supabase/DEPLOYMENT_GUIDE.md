# RLS Deployment Guide

## Risk Assessment

### Phase 1: Add Roles System (Low Risk ⚠️)
**Migration:** `20260109000001_add_roles_system.sql`

**Risk Level:** LOW - Non-breaking change
- ✅ Adds new columns (`role`, `is_super_admin`) without removing anything
- ✅ Preserves all existing permission flags (renames to `_deprecated_*`)
- ✅ No RLS enabled yet - app continues to work exactly as before
- ✅ Can be deployed to production safely without frontend changes

**What could go wrong:**
- Migration fails if enum type conflicts (very unlikely)
- Solution: Check for existing `user_role` type first

**Rollback:** Simple column drop (see `ROLLBACK_rls_if_needed.sql`)

---

### Phase 2: Enable RLS (High Risk ⚠️⚠️⚠️)
**Migration:** `20260109000002_enable_rls_policies.sql`

**Risk Level:** HIGH - Breaking change
- ⚠️ Enables Row Level Security on 4 core tables
- ⚠️ Existing queries will return filtered results (may appear as "no data")
- ⚠️ Frontend must be updated to work with RLS BEFORE deployment
- ⚠️ Cannot deploy to production until frontend code is ready

**What could go wrong:**
1. **Frontend queries fail**: If frontend isn't updated, users may see empty data
2. **Permission denied errors**: Queries without proper context will fail
3. **Performance issues**: RLS adds overhead to every query

**Mitigation:**
- Deploy Phase 1 first, test thoroughly
- Update ALL frontend code before Phase 2
- Test in staging environment first
- Deploy during low-traffic window
- Have rollback script ready

**Emergency Rollback:** Run first section of `ROLLBACK_rls_if_needed.sql`:
```sql
ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```
This takes ~1 second and immediately restores pre-RLS behavior.

---

## Recommended Deployment Strategy

### Strategy 1: Safe Phased Rollout (Recommended)

**Week 1: Phase 1 Only**
1. Deploy migration `20260109000001_add_roles_system.sql` to production
2. Verify role assignment is correct (run verification queries below)
3. App continues to use old permission flags - no change to behavior
4. Monitor for any issues

**Week 2: Frontend Development**
1. Update frontend code to use new `role` field
2. Test thoroughly in dev environment
3. Create staging environment and test with Phase 2 enabled

**Week 3: Phase 2 Deployment**
1. Deploy frontend changes first (they should gracefully handle both systems)
2. Deploy migration `20260109000002_enable_rls_policies.sql`
3. Monitor closely for first hour
4. Roll back immediately if any issues (disable RLS takes 1 second)

---

### Strategy 2: All-at-Once (Higher Risk)

**Only use this if:**
- You have a solid staging environment
- You've tested thoroughly
- You can tolerate 5-10 minutes of downtime

**Steps:**
1. Put app in maintenance mode
2. Deploy both migrations
3. Deploy frontend changes
4. Run verification queries
5. Take app out of maintenance mode
6. Monitor closely

---

## Verification Queries

### After Phase 1 (Role Migration)

**Check that all users have a role:**
```sql
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;
```
Expected: All users should have a role (no NULLs)

**Check super admin assignment:**
```sql
SELECT email, role, is_super_admin
FROM users
WHERE is_super_admin = true;
```
Expected: Only platform owners should be super admins

**Verify role distribution makes sense:**
```sql
SELECT
  role,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users
GROUP BY role;
```
Expected: Most users should be viewers/editors, few admins

**Check deprecated columns were renamed:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name LIKE '_deprecated_%';
```
Expected: Should see 11 `_deprecated_*` columns

---

### After Phase 2 (RLS Enabled)

**Check that RLS is enabled:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sheets', 'answers', 'companies', 'users');
```
Expected: All 4 tables should show `rowsecurity = true`

**Test helper functions (run as a test user, not super admin):**
```sql
-- Should return the user's company ID
SELECT auth.user_company_id();

-- Should return false (unless testing as super admin)
SELECT auth.is_super_admin();

-- Should return user's association IDs
SELECT * FROM auth.user_association_ids();

-- Should return visible company IDs
SELECT * FROM auth.visible_company_ids();
```

**Test sheet visibility (as a specific user):**
```sql
-- Run this in Supabase SQL editor with RLS enforced:
SELECT COUNT(*) as visible_sheets
FROM sheets;
```
Expected: Should see only sheets where user's company is involved

**Test association member profiles:**
```sql
SELECT * FROM association_member_profiles;
```
Expected: Should see only companies in user's association(s)

---

## Monitoring After Deployment

**Key Metrics to Watch:**

1. **Error Rate**: Look for "permission denied" or "no rows returned" errors
2. **Query Performance**: RLS adds ~10-50ms overhead per query
3. **User Complaints**: Watch for "I can't see my data" reports

**Supabase Dashboard Queries:**

```sql
-- Find slow queries (over 100ms)
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check for permission denied errors in logs
-- (Use Supabase logs interface for this)
```

---

## Rollback Procedures

### Emergency: Disable RLS Immediately (30 seconds)

If users can't see data or getting errors:

1. Open Supabase SQL Editor
2. Run:
```sql
ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```
3. Verify app is working
4. Investigate issue offline

**Impact:** App immediately returns to pre-RLS behavior. No data loss.

---

### Full Rollback: Remove All Changes (5 minutes)

If you want to completely undo the role system:

1. Run entire `ROLLBACK_rls_if_needed.sql` file
2. Redeploy old frontend code (if changed)
3. Verify old permission flags are working

**Impact:** Completely removes role system, restores 11 boolean flags. No data loss.

---

## Testing Checklist Before Production

- [ ] Phase 1 migration runs successfully in dev
- [ ] All users get assigned a role (no NULLs)
- [ ] Super admin flag is set correctly
- [ ] Frontend code updated to use `role` field
- [ ] Phase 2 migration runs successfully in staging
- [ ] Test user can see their own sheets
- [ ] Test user can edit sheets (if editor/admin)
- [ ] Test user cannot see other companies' sheets
- [ ] Test association member directory shows correct companies
- [ ] Test super admin can see all data
- [ ] Performance testing shows acceptable query times
- [ ] Rollback script tested in dev

---

## Support Contacts

**If issues arise:**
1. Check Supabase logs for specific errors
2. Run verification queries to diagnose
3. Use emergency rollback if needed
4. Document what went wrong for future reference

**Common Issues:**

| Issue | Cause | Fix |
|-------|-------|-----|
| "No sheets visible" | RLS enabled but user not properly linked to company | Check user's `company_id` is set |
| "Permission denied on answers" | User doesn't have editor role | Check user's `role` field |
| "Can't see association members" | Association membership not set up | Verify `association_companies` or `stacks.association_id` |
| "Slow queries" | RLS overhead on complex queries | Add indexes, optimize helper functions |

---

## Success Criteria

**Phase 1 Success:**
- ✅ All users have a `role` value
- ✅ Super admins identified correctly
- ✅ App continues to work normally
- ✅ No user complaints

**Phase 2 Success:**
- ✅ RLS enabled on all 4 tables
- ✅ Users can see their own data
- ✅ Users cannot see other tenants' data
- ✅ Association members can see each other
- ✅ Query performance acceptable (<200ms)
- ✅ No "permission denied" errors
- ✅ Super admin can access all data

---

## Timeline

**Conservative Approach (3 weeks):**
- Week 1: Deploy Phase 1, verify role assignment
- Week 2: Update frontend, test in staging
- Week 3: Deploy Phase 2, monitor closely

**Aggressive Approach (1 week):**
- Day 1-2: Deploy Phase 1, update frontend in parallel
- Day 3-4: Test Phase 2 in staging
- Day 5: Deploy Phase 2 to production
- Day 6-7: Monitor and fix issues

**Choose based on:**
- How critical the system is
- User tolerance for issues
- Your confidence in the testing
- Availability of rollback window

# RLS Investigation Report

## Summary

The anonymous Supabase client is returning 0 rows for both `choices` and `answers` tables because **Row Level Security (RLS) is enabled on these tables but there are no policies that allow anonymous/public SELECT access**.

## Current State

### Data Verification (Service Role)
- **Choices table**: 586 rows exist
- **Answers table**: 367,327 rows exist
- Service role can access all data (bypasses RLS)

### Table Schemas
**Choices columns:**
- id, bubble_id, content, import_map, parent_question_id, order_number, created_at, modified_at, created_by

**Answers columns:**
- id, bubble_id, answer_name, answer_id_number, order_number, sheet_id, company_id, supplier_id, customer_id, originating_question_id, parent_question_id, parent_subsection_id, stack_id, text_value, text_area_value, number_value, boolean_value, date_value, file_url, support_file_url, support_text, clarification, choice_id, custom_comment_text, custom_row_text, custom_list_row_id, list_table_column_id, list_table_row_id, import_double_check, version_in_sheet, version_copied, enter_value_id, created_at, modified_at, created_by, slug

## Root Cause

When RLS is enabled on a table in Supabase:
1. **Without any policies**: No rows are returned to any user (except service role which bypasses RLS)
2. **With policies**: Only rows matching the policy conditions are returned

Since there are no RLS policies allowing anonymous SELECT access on `choices` and `answers` tables, the anonymous client gets 0 rows even though data exists.

## Solution

Create RLS policies that allow public SELECT access on both tables.

### Option 1: Run SQL in Supabase Dashboard (RECOMMENDED)

1. Go to: https://supabase.com/dashboard/project/yrguoooxamecsjtkfqcw/sql
2. Run the contents of `fix-rls-policies.sql`:

```sql
-- CHOICES TABLE
DROP POLICY IF EXISTS "Enable read access for all users" ON choices;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON choices;
DROP POLICY IF EXISTS "choices_select_policy" ON choices;

ALTER TABLE choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON choices
  FOR SELECT
  USING (true);

-- ANSWERS TABLE
DROP POLICY IF EXISTS "Enable read access for all users" ON answers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON answers;
DROP POLICY IF EXISTS "answers_select_policy" ON answers;

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON answers
  FOR SELECT
  USING (true);
```

### Option 2: Run via psql

```bash
psql -h db.yrguoooxamecsjtkfqcw.supabase.co -p 5432 -d postgres -U postgres -f fix-rls-policies.sql
```

## Verification

After applying the fix, test with an anonymous client:

```typescript
import { createClient } from '@supabase/supabase-js';

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // Get from Dashboard > Settings > API
);

const { count: choicesCount } = await anonClient
  .from('choices')
  .select('*', { count: 'exact', head: true });

const { count: answersCount } = await anonClient
  .from('answers')
  .select('*', { count: 'exact', head: true });

console.log('Choices:', choicesCount); // Should be 586
console.log('Answers:', answersCount); // Should be 367327
```

## Files Created

- `check-rls.sql` - SQL queries to check current RLS status
- `fix-rls-policies.sql` - SQL to fix RLS policies
- `test-anon-access.ts` - Script to test anonymous access
- `RLS_INVESTIGATION_REPORT.md` - This report

## Next Steps

1. Run `fix-rls-policies.sql` in Supabase Dashboard SQL Editor
2. Add `SUPABASE_ANON_KEY` to `.env` file (get from Dashboard > Settings > API)
3. Test anonymous access to verify the fix works
4. Consider if you want different RLS policies (e.g., filtering by user_id for write operations)

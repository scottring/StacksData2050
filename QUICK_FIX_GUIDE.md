# Quick Fix Guide: RLS Policies for Choices and Answers

## Problem
Anonymous Supabase client returns 0 rows for `choices` and `answers` tables even though data exists.

## Root Cause
RLS (Row Level Security) is enabled on both tables but there are no policies allowing anonymous SELECT access.

## Quick Fix (1 minute)

### Step 1: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/yrguoooxamecsjtkfqcw/sql

### Step 2: Run this SQL

```sql
-- Fix for choices table
CREATE POLICY "Enable read access for all users" ON choices
  FOR SELECT
  USING (true);

-- Fix for answers table  
CREATE POLICY "Enable read access for all users" ON answers
  FOR SELECT
  USING (true);
```

### Step 3: Verify
Run this to confirm policies were created:

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('choices', 'answers');
```

Expected output:
- choices | Enable read access for all users | SELECT | true
- answers | Enable read access for all users | SELECT | true

## Test the Fix

Add to your `.env` file (get from Dashboard > Settings > API):
```
SUPABASE_ANON_KEY=your_anon_key_here
```

Then test with this code:
```typescript
import { createClient } from '@supabase/supabase-js';

const anonClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Should now return data
const { data } = await anonClient.from('choices').select('*').limit(1);
console.log('Choices working:', !!data);

const { data: answers } = await anonClient.from('answers').select('*').limit(1);
console.log('Answers working:', !!answers);
```

## Why This Works

- `USING (true)` = allow access to all rows
- `FOR SELECT` = applies to read operations
- Policy applies to all users including anonymous (public role)
- Service role always bypasses RLS, so service role client continues working

## Alternative: If You Need Row-Level Filtering

If you want to restrict access based on user:
```sql
-- Example: Only show user's own data
CREATE POLICY "Users see own data" ON answers
  FOR SELECT
  USING (auth.uid() = created_by);
```

But for now, `USING (true)` allows public read access for all rows.

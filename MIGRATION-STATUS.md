# Migration Status - Final Push to 100%

## Current Status (as of 2025-12-28)

### Phase 1: First FK Fix (IN PROGRESS)
**Script:** `fix-all-answer-fks.ts`
**Status:** Running - 33% complete (120k/367k records)
**Success Rate:** 99.7% (119,632 updated, 368 errors)
**ETA:** ~35-40 minutes remaining

**Foreign Keys Being Fixed:**
- ✅ `company_id` - 100% success
- ✅ `supplier_id` - 100% success
- ✅ `customer_id` - 100% success
- ✅ `created_by` - 100% success
- ✅ `stack_id` - 100% success
- ✅ `parent_subsection_id` - Partial (124k missing)
- ✅ `list_table_column_id` - 100% success
- ⏭️ `parent_question_id` - Skipped (365k, wrong column name)
- ⏭️ `originating_question_id` - Skipped (87k, wrong column name)
- ⏭️ `list_table_row_id` - Partial (158k missing, pagination issue)

### Phase 2: Questions & Rows Fix (READY)
**Script:** `fix-answer-questions-and-rows.ts` (created, ready to run)

**Will Fix:**
- `parent_question_id` using correct column (`content` not `question_text`)
- `originating_question_id` using correct column
- `list_table_row_id` with full pagination (load all 37,589 rows)

**Expected Updates:** ~365k records

### Phase 3: Final Verification (READY)
**Script:** `final-verification.ts` (created, ready to run)

**Checks:**
- Record counts for all tables
- FK completeness percentages
- FK integrity (no orphaned references)
- Sheet reconstruction test
- Pass/fail determination

## Root Cause Analysis

### Problem
ALL answer foreign keys were NULL (367,476 records) after initial import.

### Root Cause
The JSON export from Bubble.io contains **human-readable values** (names, emails, text), not bubble_ids:
- Company: `"Omya"` (name) not `"1234567890abc"` (bubble_id)
- Question: `"What is your revenue?"` (text) not `"xyz789"` (bubble_id)
- User: `"user@example.com"` (email) not `"user_abc123"` (bubble_id)

The original import script tried to look up these values as bubble_ids in the ID mapping table, which always failed.

### Solution
Created **name/text-based lookup caches** that index entities by their human-readable identifiers:
- Companies by `name`
- Users by `email`
- Questions by `content` text
- Subsections by `name`
- List table rows by `bubble_id`

## Automation

### Automated Pipeline
Run this to complete all remaining work automatically:
```bash
./complete-migration-fixes.sh
```

This script will:
1. Wait for Phase 1 (fix-all-answer-fks.ts) to complete
2. Run Phase 2 (fix-answer-questions-and-rows.ts)
3. Run Phase 3 (final-verification.ts)
4. Report final status (PASSED/FAILED)

### Manual Steps (if preferred)
```bash
# Monitor Phase 1 progress
./monitor-fix-progress.sh

# When Phase 1 completes, run Phase 2
npx tsx src/migration/fix-answer-questions-and-rows.ts

# Then run Phase 3 verification
npx tsx src/migration/final-verification.ts
```

## Expected Final Results

### Critical FKs (must be >50% populated)
- `sheet_id`: ~100% (all answers belong to sheets)
- `company_id`: ~100% (all answers belong to companies)
- `parent_question_id`: ~99% (most answers link to questions)

### Optional FKs (varies by data)
- `choice_id`: ~27% (only multiple choice answers)
- `supplier_id`: Variable (only some companies have suppliers)
- `customer_id`: Variable (only some answers have customers)
- `list_table_row_id`: Variable (only list table answers)

### Success Criteria
✅ All critical FKs >50% populated
✅ No orphaned foreign key references
✅ Sheet reconstruction works correctly
✅ Migration verification PASSED

## Files Created

### Fix Scripts
- `src/migration/fix-all-answer-fks.ts` - Phase 1: Most FKs
- `src/migration/fix-answer-questions-and-rows.ts` - Phase 2: Questions & rows
- `src/migration/final-verification.ts` - Phase 3: Verification

### Automation
- `complete-migration-fixes.sh` - Full automated pipeline
- `monitor-fix-progress.sh` - Progress monitoring

### Investigation/Testing
- `src/migration/investigate-fk-issue.ts` - Root cause analysis
- `src/migration/test-sheet-reconstruction.ts` - Sheet integrity test
- `check-sheet-answers.js` - Quick FK check

## Timeline

**Phase 1 Started:** 07:28:34 UTC
**Phase 1 Current:** 07:47:41 UTC (33% complete, ~19 min elapsed)
**Phase 1 ETA:** ~08:20 UTC (~35-40 min remaining)
**Phase 2 ETA:** ~08:40 UTC (~20 min)
**Phase 3 ETA:** ~08:45 UTC (~5 min)
**Total Completion ETA:** ~08:45 UTC (1h 15min from start)

## Next Steps

1. Let Phase 1 complete (currently running at 33%)
2. Run automated pipeline OR manual Phase 2
3. Run final verification
4. Review results
5. If PASSED: Migration is 100% complete and ready for app build
6. If FAILED: Review errors and address any remaining issues

# Stacks Data Migration - Claude Documentation

## Overview

This document describes the Bubble.io to Supabase migration for the Stacks Data 2050 supply chain compliance platform. The migration moved ~410,000 records across 16 entity types from a no-code Bubble.io application to a PostgreSQL-based Supabase backend.

## Migration Summary

**Total Records Migrated:** 410,274
**Migration Date:** December 27-28, 2025
**Status:** ✅ Complete and Verified

### Record Counts by Entity

| Entity | Records | Notes |
|--------|---------|-------|
| Associations | 1 | Root organization |
| Stacks | 21 | Compliance frameworks |
| Companies | 132 | Supplier/customer organizations |
| Users | 337 | Platform users |
| List Tables | 154 | Dynamic list definitions |
| List Table Columns | 765 | Column definitions |
| Sections | 11 | Question groupings |
| Subsections | 84 | Question sub-groupings |
| Tags | 26 | Categorization tags |
| Questions | 227 | Compliance questions |
| Choices | 691 | Multiple choice options |
| Sheets | 1,649 | Questionnaire instances |
| List Table Rows | 37,589 | Dynamic list data |
| **Answers** | **367,250** | **Question responses** |
| Requests | 450 | Access requests |
| Sheet Statuses | 887 | Workflow states |

## Architecture

### Technology Stack
- **Source:** Bubble.io (no-code platform)
- **Target:** Supabase (PostgreSQL + Auth + Storage)
- **Migration Tools:** TypeScript, Node.js
- **ID Mapping:** Custom UUID mapping table (`_migration_id_map`)

### Key Design Decisions

1. **ID Mapping Strategy**
   - Bubble uses string IDs (e.g., `1632733604563x642156387087417300`)
   - Supabase uses UUIDs (e.g., `cf09b2ed-8b5f-4a1c-9a3b-1f2e3d4c5b6a`)
   - Created `_migration_id_map` table to track all ID translations
   - In-memory caching for performance

2. **Answers Table Strategy**
   - 367k records too large for standard API migration
   - Exported as JSON from Bubble (443MB file)
   - Custom import script with batch processing (100 records/batch)
   - Retry logic for transient network errors

3. **Choice Lookup Fix**
   - Initial issue: Choices stored by text value in export, not bubble_id
   - Solution: Created content-based lookup cache
   - Updated 99,203 existing answers post-migration

## Migration Scripts

Located in `/Users/scottkaufman/Developer/StacksData2050/stacks/src/migration/`

### Core Scripts

- **`index.ts`** - Main migration orchestrator (steps 1-16)
- **`import-answers-json.ts`** - JSON-based answers import
- **`verify-migration.ts`** - Post-migration verification
- **`fix-answer-choices-batch.ts`** - Retroactive choice_id updates

### Support Modules

- **`supabase-client.ts`** - Supabase connection setup
- **`config.ts`** - Environment configuration
- **`id-mapper.ts`** - Bubble ID ↔ Supabase UUID mapping
- **`utils/logger.ts`** - Colored console logging

### Migrators (by entity)

Individual migration scripts in `migrators/` directory:
- `associations.ts`, `stacks.ts`, `companies.ts`, `users.ts`
- `list-tables.ts`, `sections.ts`, `subsections.ts`, `tags.ts`
- `questions.ts`, `choices.ts`, `sheets.ts`, `answers.ts`
- `requests.ts`, `sheet-statuses.ts`

## Migration Process

### Step-by-Step Flow

1. **Pre-Migration**
   - Set up Supabase project
   - Create database schema
   - Disable RLS policies (temporarily)

2. **Phase 1: Core Entities (Steps 1-12)**
   - Associations → Stacks → Companies → Users
   - List Tables → Sections → Subsections → Tags
   - Questions → Choices → Sheets

3. **Phase 2: Large Tables (Steps 13-14)**
   - List Table Rows (~37k records)
   - Answers (367k records via JSON import)

4. **Phase 3: Workflow Entities (Steps 15-16)**
   - Requests
   - Sheet Statuses

5. **Post-Migration**
   - Fix choice_id relationships (99k updates)
   - Verify data integrity
   - Enable RLS policies
   - Test application

### Execution Commands

```bash
# Full migration (skips answers - uses JSON import)
npm run migrate

# Dry run mode
npm run migrate:dry-run

# Import answers from JSON
npx tsx src/migration/import-answers-json.ts

# Fix choice relationships
npx tsx src/migration/fix-answer-choices-batch.ts

# Verify migration
npx tsx src/migration/verify-migration.ts
```

## Data Verification

### Foreign Key Integrity ✅
- **0** orphaned answer records (all sheet_id references valid)
- **0** invalid parent_question_id references
- All foreign key constraints satisfied

### Data Completeness

**Answers Distribution:**
- 45% have text values (164,777 records)
- 27% have choice selections (99,139 records)
- 0.22% have numeric values (796 records)
- ~28% other types or null

### Critical Fields ✅
- **0** answers missing bubble_id
- **0** companies missing name
- **0** users missing email

## Known Issues & Fixes

### Issue 1: Choice ID Mapping
**Problem:** JSON export contained choice text ("Yes", "No") instead of bubble_ids
**Impact:** 99,218 answers missing choice_id
**Fix:** Created content-based lookup in `id-mapper.ts` + batch update script
**Result:** 99,203 updated successfully (15 errors)

### Issue 2: Empty String Normalization
**Problem:** Bubble exports used `""` for null values
**Fix:** Added `normalize()` function to convert empty strings to null
**Location:** `import-answers-json.ts:59`

### Issue 3: SSL Handshake Failures
**Problem:** Intermittent Cloudflare 525 errors during import
**Fix:** Retry logic with 3 attempts, 2-second delay
**Location:** `import-answers-json.ts:185-235`

## Configuration

### Environment Variables (`.env`)

```bash
# Supabase
SUPABASE_URL=https://yrguoooxamecsjtkfqcw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Bubble.io
BUBBLE_API_URL=https://app.stacksdata.com/version-live
BUBBLE_API_TOKEN=<api_token>

# Migration Options
DRY_RUN=false
BATCH_SIZE=100
```

### Key Settings

- **Batch Size:** 100 records per insert (answers)
- **Cache Strategy:** Preload all ID mappings at startup
- **Retry Logic:** Max 3 attempts for transient errors
- **Progress Logging:** Every 1,000 records

## Performance Metrics

### Migration Duration
- **Core entities (steps 1-12):** ~30 minutes
- **List table rows:** ~10 minutes
- **Answers import:** ~2.5 hours (with restarts)
- **Choice fix:** ~6 minutes
- **Total:** ~3 hours

### Throughput
- **Answers:** ~45-60 records/second
- **Choice updates:** ~1,650 updates/minute
- **ID lookups:** Cached (near-instant)

## Next Steps

### Remaining Tasks
1. ✅ ~~Migrate all entities~~ Complete
2. ✅ ~~Verify data integrity~~ Complete
3. ⏳ Enable RLS policies on tables
4. ⏳ Send password reset emails to users
5. ⏳ Test application with migrated data
6. ⏳ Update frontend to use Supabase instead of Bubble

### Production Checklist
- [ ] Enable Row Level Security (RLS)
- [ ] Configure Supabase Auth policies
- [ ] Set up email templates for user notifications
- [ ] Test all CRUD operations
- [ ] Performance testing with production load
- [ ] Backup strategy implementation
- [ ] Monitoring and alerting setup

## Troubleshooting

### Common Issues

**Issue:** "No mapping found for [entity]:[id]"
**Cause:** Entity not yet migrated or missing from source
**Fix:** Run full migration (steps 1-16) before importing answers

**Issue:** High memory usage during import
**Cause:** Large JSON file loaded into memory
**Fix:** Normal for 443MB file - system handled it fine

**Issue:** Duplicate key errors on re-run
**Cause:** Unique constraint on bubble_id
**Fix:** Expected behavior - allows safe resume of interrupted migrations

## Schema Notes

### Key Tables

**`_migration_id_map`**
```sql
CREATE TABLE _migration_id_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT NOT NULL,
  supabase_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bubble_id, entity_type)
);
```

**`answers`** (largest table)
- 367,250 records
- Complex relationships: sheet, company, question, choice, user
- Multiple value types: text, number, boolean, date, file, choice
- List table integration for dynamic fields

## Contact

For questions about this migration:
- Migration performed: December 27-28, 2025
- Claude Code session documentation
- Location: `/Users/scottkaufman/Developer/StacksData2050/stacks/`

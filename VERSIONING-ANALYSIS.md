# Sheet Versioning Analysis - HYDROCARB 90-ME 78%

## Executive Summary

Bubble's versioning system creates **separate sheet records** for each version, but **answers are NOT automatically copied** to new versions. For HYDROCARB 90-ME 78%, all 667 answers remain attached to Version 1 (the original), even though Versions 2 and 3 were created later.

## Current State

### Sheet Versions

| Version | Sheet ID | Status | Created | Closed | Answers |
|---------|----------|--------|---------|--------|---------|
| 1 | `8a3424ae-49d9-4f8a-a4af-fda13a222b28` | CLOSED | 2022-08-08 | 2022-08-25 | **667** |
| 2 | `8222b70c-14dd-48ab-8ceb-e972c9d797c3` | CLOSED | 2022-08-25 | 2025-04-08 | **0** |
| 3 | `fc48461e-7a18-4cb1-887e-1a3686244ef0` | OPEN | 2025-04-08 | - | **0** |

### Key Finding

**All 667 answers are in Version 1**, and some were modified as recently as **2025-04-08** (the same day Version 3 was created). This indicates:

1. **Answers stay with original version** - Bubble doesn't automatically copy answers to new versions
2. **Answers can be modified after version is closed** - Even though Version 1 was "locked" on 2022-08-25, answers were still being modified in 2025
3. **New versions start empty** - Versions 2 and 3 have no answers

## Bubble's Versioning Schema

### Sheets Table Structure

```typescript
{
  id: uuid                          // Unique sheet ID
  version: number                   // Version number (1, 2, 3, etc.)
  father_sheet_id: uuid             // ID of the original (Version 1) sheet
  prev_sheet_id: uuid               // ID of the immediately previous version

  version_lock: boolean             // true = version is closed/locked
  version_close_date: timestamp     // When version was closed
  version_closed_by: uuid           // User who closed the version
  version_description: string       // Why version was created

  version_count_expected: number    // Expected number of versions?
  version_count_original: number    // Original count?
  version_count_processed: number   // Processed count?

  created_at: timestamp
  modified_at: timestamp
  mark_as_archived: boolean
}
```

### Answers Table Structure

```typescript
{
  id: uuid
  sheet_id: uuid                    // Links to sheets.id (the specific version)
  parent_question_id: uuid
  choice_id: uuid

  version_copied: boolean           // Was this answer copied from previous version?
  version_in_sheet: number          // Which version is this answer for?

  created_at: timestamp
  modified_at: timestamp

  // Answer values
  text_value: string
  boolean_value: boolean
  number_value: number
  date_value: timestamp
  // ... etc
}
```

## Version Relationships

```
Version 1 (father)
  ├── 667 answers (98 unique questions)
  ├── father_sheet_id: NULL (it IS the father)
  ├── prev_sheet_id: NULL
  └── Closed: 2022-08-25
      │
      ├─> Version 2 (child)
      │     ├── 0 answers
      │     ├── father_sheet_id: Version 1 ID
      │     ├── prev_sheet_id: Version 1 ID
      │     └── Closed: 2025-04-08
      │         │
      │         └─> Version 3 (grandchild - CURRENT)
      │               ├── 0 answers
      │               ├── father_sheet_id: Version 1 ID
      │               ├── prev_sheet_id: Version 2 ID
      │               └── OPEN (not closed)
```

## How Bubble Versioning Works

### Version Creation
1. When "New version on submit" is triggered:
   - A new sheet record is created with incremented `version` number
   - `father_sheet_id` points to the original (Version 1)
   - `prev_sheet_id` points to the immediately previous version
   - Previous version gets `version_lock = true` and `version_close_date` set

### Answer Handling
- **Answers are NOT automatically copied** to new versions
- Each answer has `sheet_id` pointing to a specific version
- `version_copied` field suggests there MAY be a manual copy mechanism, but it wasn't used here
- For HYDROCARB 90-ME 78%, all answers remain on Version 1

### Approval/Review Workflow
Based on the structure:
- `version_lock` indicates whether a version is "closed" for editing
- Once closed, the version theoretically shouldn't be edited
- However, **Version 1 answers were modified AFTER it was locked**, suggesting:
  - Either the lock isn't enforced on answers
  - Or there's a separate "approved" status we haven't found yet
  - Or modifications were made to the underlying data outside the normal workflow

## Problem for Migration

### Current Issue
You mentioned that you see "3 different versions with different answers entered at different times", but in Supabase:
- **Version 1: 667 answers** (some created 2022-08-25, some modified 2025-04-08)
- **Version 2: 0 answers**
- **Version 3: 0 answers**

This doesn't match your expectation of "different answers in different versions."

### Possible Explanations

1. **Answers weren't migrated for V2 and V3**
   - The migration script may have only copied answers for Version 1
   - Check Bubble directly to see if V2 and V3 have answers

2. **Bubble stores answers differently**
   - Maybe in Bubble UI, you see V2 and V3 with answers, but they're actually referencing V1 answers
   - The `version_in_sheet` field might control which answers display for which version

3. **Answer copying mechanism wasn't triggered**
   - There might be a "copy answers from previous version" workflow that wasn't used

## Recommendations

### Option 1: Keep Current Structure (Recommended)

**Preserve the exact Bubble versioning model:**

✅ **Pros:**
- Exact fidelity to Bubble's model
- Supports proper version history
- Can track which answers were entered/modified in each version
- Supports review workflow (lock/unlock versions)
- Clear audit trail of changes

❌ **Cons:**
- More complex to query (need to traverse version chain)
- UI needs to handle version selection
- Storage overhead (multiple sheet records for same product)

**Implementation:**
```typescript
// Keep current schema as-is
sheets: {
  id, version, father_sheet_id, prev_sheet_id,
  version_lock, version_close_date, version_closed_by
}

answers: {
  id, sheet_id, // points to specific version
  version_copied, version_in_sheet
}

// To get current version:
SELECT * FROM sheets
WHERE name = 'HYDROCARB 90-ME 78%'
AND version_lock = false

// To get version history:
SELECT * FROM sheets
WHERE father_sheet_id = '<original_id>'
OR id = '<original_id>'
ORDER BY version
```

### Option 2: Merge All Versions (Not Recommended)

**Combine all versions into one sheet, taking most recent answers:**

✅ **Pros:**
- Simpler data model
- Easier queries
- Less storage

❌ **Cons:**
- **LOSES version history** - can't see what changed when
- **LOSES review workflow** - can't lock/unlock versions for approval
- **LOSES audit trail** - can't track who changed what when
- **Breaks referential integrity** - existing answer records reference specific version IDs
- **Data loss** - if different versions truly have different answers, you'd lose that information

**⚠️ NOT RECOMMENDED** because:
1. You mentioned review process is important
2. Unverified vs verified states matter
3. You want to preserve approval workflow

### Option 3: Investigate and Fix Answer Migration

**First, check if V2 and V3 actually have answers in Bubble:**

1. Use Bubble MCP or API to query answers for all 3 versions
2. If V2 and V3 have answers in Bubble but not in Supabase, re-run answer migration
3. If V2 and V3 truly have no answers in Bubble either, then current state is correct

**Next steps:**
```bash
# Check Bubble for V2 answers
bubble_id_v2="1661440851034x545387418125598700"
# Check if Bubble has answers for this sheet

# Check Bubble for V3 answers
bubble_id_v3="1744099239597x968220647214809100"
# Check if Bubble has answers for this sheet
```

## Missing: Approval/Verification Status

Your requirements mention:
- "Review process may be underway"
- "Unverified vs verified state"
- "When approving a sheet, you approve all constituent questions"
- "Unless a question is flagged"

**We need to find:**
1. Where is the "approved" status stored? (per sheet or per answer?)
2. Where is the "flagged" status stored? (per question or per answer?)
3. Is there a separate `reviews` or `approvals` table?
4. Does `version_lock` = "approved"?

**Check these tables:**
- `sheets` - look for `approval_status`, `review_status`, `approved`, `approved_by`, `approved_at`
- `answers` - look for `flagged`, `approved`, `review_status`
- Look for separate tables: `reviews`, `approvals`, `flags`, `comments`

## Next Steps

1. **Check Bubble directly** for V2 and V3 answers using MCP/API
2. **Find approval/verification schema** in Supabase
3. **Verify migration completeness** - did all answers migrate?
4. **Decide on versioning strategy** based on Bubble reality
5. **Document approval workflow** for frontend implementation

## Conclusion

**The current Supabase structure DOES support versioning**, and it matches Bubble's model. The question is whether:
- The migration correctly copied all answers from all versions
- The approval/verification status fields are present
- We understand the complete workflow

**Recommended Action:** Investigate why V2 and V3 have no answers before deciding to merge or restructure.

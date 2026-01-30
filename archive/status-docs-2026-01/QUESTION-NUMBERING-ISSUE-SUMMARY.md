# Question Numbering Issue - Investigation Summary

## Problem Statement

When comparing HYDROCARB 90-ME 78% between Bubble and Supabase:
- Question 4.8.1 ("Other relevant national legislations in Europe" table) appears in Bubble but is missing/misnumbered in Supabase
- Questions after 4.8 are numbered incorrectly (4.9 in Bubble shows as 4.8 in Supabase)

## Root Cause

The issue is **incomplete metadata migration**, specifically:

1. **Subsection Sort Numbers Missing**: 77% of questions (171/221) had `subsection_sort_number = null`
2. **Incomplete Subsections Migration**: Many subsections referenced by questions don't exist in the subsections table
3. **Dynamic Numbering Failure**: The Supabase app generates question numbers like "4.8.1" from:
   - `section_sort_number` (e.g., 4)
   - `subsection_sort_number` (e.g., 8) ← **THIS WAS NULL**
   - `order_number` (e.g., 1)

## Findings

### Questions Table
- **Total questions**: 221
- **Questions with null `subsection_sort_number`**: 171 (77%)
- **Questions with `subsection_sort_number`**: 50 (23%)

### Subsections Table
- **Total subsections in Bubble**: 84
- **Total subsections migrated to Supabase**: 10 initially
- **Questions referencing non-existent subsections**: 39

### Example: Question 4.8.1
- **Exists in Supabase**: YES
- **Question ID**: 189b0699-2d41-4dc4-90fa-b42bc4347f9b
- **Name**: "Please give detailed information on the respective directive and include all relevant restrictions:"
- **Type**: List table
- **Section sort number**: 4 ✓
- **Subsection sort number**: null ❌ (should be 8)
- **Order number**: 25
- **Parent subsection ID**: 22581715-f9dd-4bed-a241-f79020c138fd (exists in DB)
- **Subsection name**: "Other relevant national legislations in Europe"

## Actions Taken

### 1. Fixed Subsection Sort Numbers (Partial)
- Script: `fix-subsection-sort-numbers.ts`
- **Results**:
  - Fixed: 82 questions
  - Subsection not found: 39 questions
  - Failed: 0

The script successfully populated `subsection_sort_number` for questions where the subsection exists in the database by looking up the subsection's `order_number`.

## Remaining Issues

### 1. Missing Subsections (39 questions affected)
Many questions reference subsections that were never migrated to Supabase. These include:
- "European Union - Framework Regulation"
- "European Union - National Regulation - Germany: BfR recommendations"
- "China - Food Contact Materials Hygiene Standards"
- "The Netherlands"
- "General Information"

**Solution needed**: Complete the subsections migration from Bubble

### 2. Bubble Data Structure Issue
Bubble does NOT store `SUBSECTION SORT NUMBER` in the question object - it's `undefined`. The subsection order must be derived from:
- The subsection's own `Order` field
- Or calculated dynamically from the subsection's position within its parent section

## Recommendations

### Immediate Actions
1. **Complete Subsections Migration**:
   - Fetch all 84 subsections from Bubble
   - Ensure proper `order_number` values
   - Link to parent sections correctly

2. **Re-run Subsection Sort Number Fix**:
   - After subsections are migrated, run the fix script again
   - Should fix the remaining 39 questions

3. **Verify Question Numbering**:
   - Test HYDROCARB 90-ME 78% again
   - Confirm 4.8.1 appears correctly
   - Confirm 4.9.1 is not misnumbered as 4.8.1

### Long-term Considerations
1. **Migration Script Updates**: Update the questions migrator to properly handle subsection_sort_number during initial migration
2. **Data Validation**: Add validation to ensure all foreign key references (parent_subsection_id) point to existing records
3. **Dynamic Numbering Logic**: Document how question numbers should be generated in the frontend

## Files Created
- `find-missing-section-48.ts` - Investigation script
- `search-for-section.ts` - Bubble section search
- `check-subsection-answers.ts` - Answer mapping analysis
- `check-question-details.ts` - Question detail lookup
- `analyze-subsection-sort-numbers.ts` - Comprehensive analysis
- `check-subsections-migration.ts` - Migration status check
- `fix-subsection-sort-numbers.ts` - **Partial fix applied**
- `QUESTION-NUMBERING-ISSUE-SUMMARY.md` - This document

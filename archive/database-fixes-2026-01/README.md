# Database Fixes - January 2026

## Overview
This directory contains 141 diagnostic and fix scripts used to resolve massive database integrity issues affecting 71,293 answers across all sheets.

## Issues Fixed

### 1. Orphaned Choice References (58,666 answers)
- **Problem**: Answers were pointing to 3 global orphaned choice IDs instead of question-specific choices
- **Root Cause**: During duplicate choice cleanup, answers weren't updated to point to the correct remaining choices
- **Solution**:
  - First pass: Remapped 19,359 answers to correct choice IDs
  - Created 129 missing standard choices (Yes/No/Not assessed) for 43 questions
  - Second pass: Remapped 39,307 additional answers

### 2. Broken Answer Choice IDs (12,627 answers)
- **Problem**: Answers pointing to deleted choice IDs from duplicate cleanup
- **Sections Affected**: Biocides, Ecolabels, Additional Requirements, Food Contact
- **Solution**: Systematically remapped all broken answers to correct choices by matching content

### 3. Duplicate Choices (263 records)
- **Problem**: Multiple choice records with identical content for the same question
- **Solution**: Removed duplicates, kept one canonical choice per content/question pair

### 4. Biocides Section Structure Issues
- **Problem**: Duplicate subsections, incorrect numbering, orphaned questions
- **Solution**:
  - Consolidated to single "Biocides" subsection
  - Implemented dependent question numbering (3.1.1.1 format)
  - Removed duplicate Article 95 PT6 question after migrating 488 answers

## Key Scripts

### Diagnostic Scripts
- `check-all-broken-answers.ts` - Found 77% of answers were broken globally
- `check-deleted-questions.ts` - Verified orphaned answers referenced valid questions
- `debug-missing-choices.ts` - Investigated why choices weren't found

### Fix Scripts
- `remap-all-orphaned-answers.ts` - Remapped 58,666 orphaned answers (2 passes)
- `create-standard-choices-for-questions.ts` - Created 129 missing choices
- `fix-all-biocides-answers-globally.ts` - Fixed 4,084 Biocides answers
- `fix-all-answers-globally.ts` - Fixed 12,627 answers across all sections
- `fix-all-duplicate-choices.ts` - Removed 263 duplicate choices

### Import Scripts
- `import-q11-fixed.ts` - Attempted to import missing Q11 answers from Bubble
- `import-choices-for-68-questions.ts` - Attempted to import choices from Bubble API
- `import-orphaned-answers-from-bubble.ts` - Attempted Bubble API import

## Results

### Total Impact
- **71,293 answers fixed** (58,666 orphaned + 12,627 broken choice IDs)
- **Affects all 1,000+ sheets** in the database
- **All sections fixed**: Biocides, Ecolabels, Food Contact, Additional Requirements, Supplementary Modules

### User-Visible Impact
- All "Select an option..." dropdowns now display correct values
- Questions like "Does the product comply with..." now show proper Yes/No/Not assessed selections
- Systematic fix benefits all sheets equally

## Timeline
- **Duration**: ~2 days of intensive debugging and fixes
- **Date**: January 7, 2026
- **Commit**: `bdf7cdb` - "Fix massive database integrity issues - 71k+ answers corrected"

## Lessons Learned

1. **Duplicate cleanup requires cascade updates**: When removing duplicate choices, all answers must be remapped simultaneously
2. **Global vs question-specific choices**: Choices should always be question-specific, never global/shared
3. **Systematic > Individual fixes**: Focus on fixes that benefit all sheets rather than individual test cases
4. **Bubble API limitations**: Some choices were never in Bubble, requiring manual creation
5. **Batch processing**: Update answers in batches of 100 to avoid "Bad Request" errors

## Notes for Future Migrations

- Always verify foreign key references before deletion
- Use transactions when updating related records (choices + answers)
- Map bubble_id relationships carefully during migration
- Test systematically across multiple sheets, not just one test case
- Consider orphaned references as a sign of deeper structural issues

-- CLEANUP TEST/SYSTEM QUESTIONS
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- The SQL Editor has longer timeouts than the API

-- First, let's see what we're deleting
SELECT
  section_name_sort,
  subsection_name_sort,
  COUNT(*) as question_count
FROM questions
WHERE
  section_name_sort = ''
  OR section_name_sort IS NULL
  OR section_name_sort = 'Outside The Association - Section 1'
  OR section_name_sort = 'Supplementary Materials'
  OR section_name_sort = 'Rename new section'
  OR subsection_name_sort = 'General Section'
  OR subsection_name_sort = 'Sub-section for company not in the association'
  OR subsection_name_sort = 'Automatic #1'
  OR name ILIKE '%test question%'
  OR name ILIKE '%is scott from%'
  OR name ILIKE '%heather, can you see%'
  OR name ~ '^Question #\s+\d+$'
GROUP BY section_name_sort, subsection_name_sort
ORDER BY question_count DESC;

-- Get the question IDs to delete
CREATE TEMP TABLE questions_to_delete AS
SELECT id FROM questions
WHERE
  section_name_sort = ''
  OR section_name_sort IS NULL
  OR section_name_sort = 'Outside The Association - Section 1'
  OR section_name_sort = 'Supplementary Materials'
  OR section_name_sort = 'Rename new section'
  OR subsection_name_sort = 'General Section'
  OR subsection_name_sort = 'Sub-section for company not in the association'
  OR subsection_name_sort = 'Automatic #1'
  OR name ILIKE '%test question%'
  OR name ILIKE '%is scott from%'
  OR name ILIKE '%heather, can you see%'
  OR name ~ '^Question #\s+\d+$';

SELECT COUNT(*) as questions_to_delete FROM questions_to_delete;

-- Count related answers
SELECT COUNT(*) as answers_to_delete
FROM answers
WHERE parent_question_id IN (SELECT id FROM questions_to_delete)
   OR originating_question_id IN (SELECT id FROM questions_to_delete);

-- Count related choices
SELECT COUNT(*) as choices_to_delete
FROM choices
WHERE parent_question_id IN (SELECT id FROM questions_to_delete);

-- Step 1: Delete answers (this is the big one)
DELETE FROM answers
WHERE parent_question_id IN (SELECT id FROM questions_to_delete)
   OR originating_question_id IN (SELECT id FROM questions_to_delete);

-- Step 2: Delete choices
DELETE FROM choices
WHERE parent_question_id IN (SELECT id FROM questions_to_delete);

-- Step 3: Delete questions
DELETE FROM questions
WHERE id IN (SELECT id FROM questions_to_delete);

-- Step 4: Clean up orphaned subsections
DELETE FROM subsections
WHERE id NOT IN (SELECT DISTINCT parent_subsection_id FROM questions WHERE parent_subsection_id IS NOT NULL);

-- Step 5: Clean up orphaned sections
DELETE FROM sections
WHERE id NOT IN (SELECT DISTINCT parent_section_id FROM questions WHERE parent_section_id IS NOT NULL)
  AND id NOT IN (SELECT DISTINCT parent_section_id FROM subsections WHERE parent_section_id IS NOT NULL);

-- Verify final counts
SELECT 'questions' as table_name, COUNT(*) as count FROM questions
UNION ALL
SELECT 'sections', COUNT(*) FROM sections
UNION ALL
SELECT 'subsections', COUNT(*) FROM subsections;

-- Clean up temp table
DROP TABLE IF EXISTS questions_to_delete;

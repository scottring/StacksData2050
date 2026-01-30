-- ============================================
-- UPDATE SHEET_ANSWERS_DISPLAY VIEW
-- January 30, 2026
--
-- Add additional_notes to the view
-- ============================================

DROP VIEW IF EXISTS sheet_answers_display;

CREATE OR REPLACE VIEW sheet_answers_display AS
WITH
-- For non-list-table answers, rank by modified_at and keep only the latest
ranked_single_answers AS (
  SELECT
    a.id,
    a.sheet_id,
    a.question_id,
    a.text_value,
    a.number_value,
    a.boolean_value,
    a.date_value,
    a.choice_id,
    a.additional_notes,
    a.list_table_row_id,
    a.list_table_column_id,
    a.created_at,
    a.modified_at,
    q.name as question_name,
    q.content as question_content,
    q.response_type,
    q.section_sort_number,
    q.subsection_sort_number,
    q.order_number as question_order,
    c.content as choice_content,
    NULL::text as list_table_column_name,
    NULL::integer as list_table_column_order,
    NULL::text as list_table_column_response_type,
    NULL::jsonb as list_table_column_choice_options,
    ROW_NUMBER() OVER (
      PARTITION BY a.sheet_id, a.question_id
      ORDER BY a.modified_at DESC NULLS LAST
    ) as rn
  FROM answers a
  JOIN questions q ON a.question_id = q.id
  LEFT JOIN choices c ON a.choice_id = c.id
  WHERE a.list_table_row_id IS NULL
),

-- For list table answers, deduplicate by (sheet, question, row, column)
-- keeping the most recent answer for each cell
ranked_list_table_answers AS (
  SELECT
    a.id,
    a.sheet_id,
    a.question_id,
    a.text_value,
    a.number_value,
    a.boolean_value,
    a.date_value,
    a.choice_id,
    a.additional_notes,
    a.list_table_row_id,
    a.list_table_column_id,
    a.created_at,
    a.modified_at,
    q.name as question_name,
    q.content as question_content,
    q.response_type,
    q.section_sort_number,
    q.subsection_sort_number,
    q.order_number as question_order,
    c.content as choice_content,
    ltc.name as list_table_column_name,
    ltc.order_number as list_table_column_order,
    ltc.response_type as list_table_column_response_type,
    ltc.choice_options as list_table_column_choice_options,
    ROW_NUMBER() OVER (
      PARTITION BY a.sheet_id, a.question_id, a.list_table_row_id, a.list_table_column_id
      ORDER BY a.modified_at DESC NULLS LAST
    ) as rn
  FROM answers a
  JOIN questions q ON a.question_id = q.id
  LEFT JOIN choices c ON a.choice_id = c.id
  LEFT JOIN list_table_columns ltc ON a.list_table_column_id = ltc.id
  WHERE a.list_table_row_id IS NOT NULL
)

-- Combine both: single answers (rn=1 only) and list table answers (rn=1 only)
SELECT
  id,
  sheet_id,
  question_id,
  text_value,
  number_value,
  boolean_value,
  date_value,
  choice_id,
  additional_notes,
  list_table_row_id,
  list_table_column_id,
  created_at,
  modified_at,
  question_name,
  question_content,
  response_type,
  section_sort_number,
  subsection_sort_number,
  question_order,
  choice_content,
  list_table_column_name,
  list_table_column_order,
  list_table_column_response_type,
  list_table_column_choice_options
FROM ranked_single_answers
WHERE rn = 1
UNION ALL
SELECT
  id,
  sheet_id,
  question_id,
  text_value,
  number_value,
  boolean_value,
  date_value,
  choice_id,
  additional_notes,
  list_table_row_id,
  list_table_column_id,
  created_at,
  modified_at,
  question_name,
  question_content,
  response_type,
  section_sort_number,
  subsection_sort_number,
  question_order,
  choice_content,
  list_table_column_name,
  list_table_column_order,
  list_table_column_response_type,
  list_table_column_choice_options
FROM ranked_list_table_answers
WHERE rn = 1;

COMMENT ON VIEW sheet_answers_display IS 'Pre-deduplicated answer view for web app. Includes additional_notes. Deduplicates answers by keeping the most recent per (sheet, question) for single answers, and per (sheet, question, row, column) for list table answers.';

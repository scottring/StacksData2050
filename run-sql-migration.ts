import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Adding additional_notes column to answers...')
  
  // We need to use the SQL editor / management API for DDL
  // Since we can't run DDL through the data API, let's check using Postgres functions
  
  // Alternative: Use the Supabase Management API
  const projectRef = process.env.SUPABASE_URL!.match(/https:\/\/([^.]+)/)?.[1]
  console.log('Project ref:', projectRef)
  
  // For now, let's verify current state and provide manual SQL
  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .limit(1)
  
  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Sample answer columns:', data?.[0] ? Object.keys(data[0]) : 'no data')
  }
  
  // Check if we can create a function to run the migration
  console.log('\n=== SQL to run in Supabase SQL Editor ===\n')
  
  console.log(`
-- Step 1: Add additional_notes column
ALTER TABLE answers ADD COLUMN IF NOT EXISTS additional_notes TEXT DEFAULT NULL;

-- Step 2: Update the view
DROP VIEW IF EXISTS sheet_answers_display;

CREATE OR REPLACE VIEW sheet_answers_display AS
WITH
ranked_single_answers AS (
  SELECT
    a.id,
    a.sheet_id,
    a.question_id,
    a.text_value,
    a.text_area_value,
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
ranked_list_table_answers AS (
  SELECT
    a.id,
    a.sheet_id,
    a.question_id,
    a.text_value,
    a.text_area_value,
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
SELECT
  id, sheet_id, question_id, text_value, text_area_value, number_value, boolean_value,
  date_value, choice_id, additional_notes, list_table_row_id, list_table_column_id,
  created_at, modified_at, question_name, question_content, response_type,
  section_sort_number, subsection_sort_number, question_order, choice_content,
  list_table_column_name, list_table_column_order, list_table_column_response_type,
  list_table_column_choice_options
FROM ranked_single_answers WHERE rn = 1
UNION ALL
SELECT
  id, sheet_id, question_id, text_value, text_area_value, number_value, boolean_value,
  date_value, choice_id, additional_notes, list_table_row_id, list_table_column_id,
  created_at, modified_at, question_name, question_content, response_type,
  section_sort_number, subsection_sort_number, question_order, choice_content,
  list_table_column_name, list_table_column_order, list_table_column_response_type,
  list_table_column_choice_options
FROM ranked_list_table_answers WHERE rn = 1;
  `)
}

main().catch(console.error)

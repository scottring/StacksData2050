/**
 * Reset Database
 *
 * DESTRUCTIVE: Drops all tables and recreates with fresh schema.
 * Run: npx tsx fresh-import/reset-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetDatabase() {
  console.log('='.repeat(60));
  console.log('  DATABASE RESET');
  console.log('='.repeat(60));
  console.log('\nThis will DROP all tables and recreate with fresh schema.\n');

  // Step 1: Drop all existing tables
  console.log('[1/2] Dropping existing tables...');

  const dropSQL = `
    -- Drop all tables in reverse dependency order
    DROP TABLE IF EXISTS answer_text_choices CASCADE;
    DROP TABLE IF EXISTS answer_shareable_companies CASCADE;
    DROP TABLE IF EXISTS answer_flags CASCADE;
    DROP TABLE IF EXISTS comments CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS answers CASCADE;
    DROP TABLE IF EXISTS sheet_tags CASCADE;
    DROP TABLE IF EXISTS sheet_questions CASCADE;
    DROP TABLE IF EXISTS sheet_shareable_companies CASCADE;
    DROP TABLE IF EXISTS sheet_supplier_users_assigned CASCADE;
    DROP TABLE IF EXISTS sheet_statuses CASCADE;
    DROP TABLE IF EXISTS requests CASCADE;
    DROP TABLE IF EXISTS sheets CASCADE;
    DROP TABLE IF EXISTS list_table_rows CASCADE;
    DROP TABLE IF EXISTS list_table_columns CASCADE;
    DROP TABLE IF EXISTS list_tables CASCADE;
    DROP TABLE IF EXISTS choices CASCADE;
    DROP TABLE IF EXISTS question_tags CASCADE;
    DROP TABLE IF EXISTS question_companies CASCADE;
    DROP TABLE IF EXISTS questions CASCADE;
    DROP TABLE IF EXISTS subsections CASCADE;
    DROP TABLE IF EXISTS sections CASCADE;
    DROP TABLE IF EXISTS tag_hidden_companies CASCADE;
    DROP TABLE IF EXISTS tags CASCADE;
    DROP TABLE IF EXISTS stack_tags CASCADE;
    DROP TABLE IF EXISTS stacks CASCADE;
    DROP TABLE IF EXISTS association_companies CASCADE;
    DROP TABLE IF EXISTS associations CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS companies CASCADE;
    DROP TABLE IF EXISTS _migration_id_map CASCADE;
    DROP TABLE IF EXISTS chemical_inventory CASCADE;
    DROP TABLE IF EXISTS sheet_chemicals CASCADE;

    -- Drop views
    DROP VIEW IF EXISTS sheet_questions CASCADE;
    DROP VIEW IF EXISTS sheets_with_flag_counts CASCADE;
  `;

  const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropSQL });

  if (dropError) {
    // RPC might not exist, try direct approach via REST
    console.log('  Using direct SQL execution...');

    // We can't execute raw SQL directly via Supabase JS client
    // Instead, we'll drop tables one by one
    const tablesToDrop = [
      'answer_text_choices', 'answer_shareable_companies', 'answer_flags',
      'comments', 'notifications', 'answers', 'sheet_tags', 'sheet_questions',
      'sheet_shareable_companies', 'sheet_supplier_users_assigned',
      'sheet_statuses', 'requests', 'sheets', 'list_table_rows',
      'list_table_columns', 'list_tables', 'choices', 'question_tags',
      'question_companies', 'questions', 'subsections', 'sections',
      'tag_hidden_companies', 'tags', 'stack_tags', 'stacks',
      'association_companies', 'associations', 'users', 'companies',
      '_migration_id_map', 'chemical_inventory', 'sheet_chemicals'
    ];

    for (const table of tablesToDrop) {
      try {
        // Delete all rows first (can't DROP via REST API)
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (!error) {
          console.log(`  Cleared: ${table}`);
        }
      } catch (e) {
        // Table might not exist, that's OK
      }
    }
  } else {
    console.log('  Tables dropped successfully');
  }

  console.log('\n[2/2] Creating fresh schema...');
  console.log('  NOTE: You need to run the schema.sql manually in Supabase SQL Editor');
  console.log('  File: fresh-import/schema.sql\n');

  // Read and display the schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Schema SQL has been generated. To complete the reset:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Paste the contents of fresh-import/schema.sql');
  console.log('3. Click "Run"');
  console.log('4. Then run: npx tsx fresh-import/import.ts');
}

resetDatabase().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('Checking current database state...\n');

  const tables = [
    'companies', 'users', 'sections', 'subsections', 'tags',
    'questions', 'choices', 'sheets', 'answers',
    'question_tags', 'sheet_tags', 'list_table_columns'
  ];

  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`${t}: (table not found or error)`);
      } else {
        console.log(`${t}: ${count || 0}`);
      }
    } catch (e) {
      console.log(`${t}: (error)`);
    }
  }
}

checkTables();

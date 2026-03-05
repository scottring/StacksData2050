import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Fetch params with detail_table_schema
  const { data } = await supabase
    .from('canonical_parameters')
    .select('code, name, section, subsection, answer_pattern, detail_table_schema')
    .eq('answer_pattern', 'with_detail_table');

  console.log(`Parameters with detail tables: ${data?.length}\n`);
  for (const p of data || []) {
    console.log(`${p.code} - ${p.name}`);
    console.log(`  Section: ${p.section} > ${p.subsection}`);
    console.log(`  Schema:`, JSON.stringify(p.detail_table_schema, null, 2));
    console.log();
  }

  // Also get a sample of canonical_answer_types
  const { data: types } = await supabase
    .from('canonical_answer_types')
    .select('*')
    .limit(5);
  console.log('=== Sample answer types ===');
  for (const t of types || []) {
    console.log(`  ${t.code}: ${JSON.stringify(t.options || t)}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });

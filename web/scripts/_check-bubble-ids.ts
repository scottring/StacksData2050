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
  // Check sheets for bubble_id
  const { data: sheets } = await supabase.from('sheets').select('*').limit(1);
  if (sheets?.[0]) {
    const cols = Object.keys(sheets[0]);
    console.log('Sheet columns:', cols.join(', '));
    console.log('Has bubble_id:', cols.includes('bubble_id'));
    if (cols.includes('bubble_id')) {
      const { data: sample } = await supabase.from('sheets').select('id, bubble_id, name').not('bubble_id', 'is', null).limit(3);
      console.log('Sample:', sample);
    }
  }

  // Check questions for bubble_id
  const { data: questions } = await supabase.from('questions').select('*').limit(1);
  if (questions?.[0]) {
    const cols = Object.keys(questions[0]);
    console.log('\nQuestion columns:', cols.join(', '));
    console.log('Has bubble_id:', cols.includes('bubble_id'));
    if (cols.includes('bubble_id')) {
      const { data: sample } = await supabase.from('questions').select('id, bubble_id, name').not('bubble_id', 'is', null).limit(3);
      console.log('Sample:', sample);
    }
  }

  // Check subsections for bubble_id
  const { data: subsections } = await supabase.from('subsections').select('*').limit(1);
  if (subsections?.[0]) {
    const cols = Object.keys(subsections[0]);
    console.log('\nSubsection columns:', cols.join(', '));
    console.log('Has bubble_id:', cols.includes('bubble_id'));
  }

  // Check companies
  const { data: companies } = await supabase.from('companies').select('*').limit(1);
  if (companies?.[0]) {
    const cols = Object.keys(companies[0]);
    console.log('\nCompany columns:', cols.join(', '));
    console.log('Has bubble_id:', cols.includes('bubble_id'));
  }

  // Count sheets with bubble_id
  if (sheets?.[0] && Object.keys(sheets[0]).includes('bubble_id')) {
    const { count } = await supabase.from('sheets').select('id', { count: 'exact', head: true }).not('bubble_id', 'is', null);
    console.log(`\nSheets with bubble_id: ${count}`);
  }
  if (questions?.[0] && Object.keys(questions[0]).includes('bubble_id')) {
    const { count } = await supabase.from('questions').select('id', { count: 'exact', head: true }).not('bubble_id', 'is', null);
    console.log(`Questions with bubble_id: ${count}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });

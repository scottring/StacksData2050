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
  // Get companies
  const { data: companies } = await supabase.from('companies').select('id, name');
  console.log('=== Companies ===');
  for (const c of companies || []) {
    console.log(`  ${c.name} -> ${c.id}`);
  }

  // Count sheets per company
  const { data: sheets } = await supabase.from('sheets').select('id, company_id');
  const sheetsByCompany: Record<string, number> = {};
  for (const s of sheets || []) {
    sheetsByCompany[s.company_id] = (sheetsByCompany[s.company_id] || 0) + 1;
  }
  console.log('\n=== Sheets per company ===');
  for (const [companyId, count] of Object.entries(sheetsByCompany)) {
    const name = companies?.find(c => c.id === companyId)?.name || '?';
    console.log(`  ${name}: ${count} sheets`);
  }

  // Answer table — check columns and how answers link to sheets
  const { data: sampleAnswer } = await supabase.from('answers').select('*').limit(1);
  if (sampleAnswer && sampleAnswer[0]) {
    console.log('\n=== Answer columns ===');
    console.log(Object.keys(sampleAnswer[0]).join(', '));
  }

  // Count answers linked to questions that have accepted mappings
  const { data: acceptedMappings } = await supabase
    .from('normalization_mappings')
    .select('legacy_question_id, canonical_parameter_id')
    .eq('status', 'accepted');

  console.log(`\n=== Accepted mappings: ${acceptedMappings?.length || 0} ===`);

  // Count total answers for these questions
  const questionIds = (acceptedMappings || []).map(m => m.legacy_question_id);
  const { count: answerCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .in('question_id', questionIds);

  console.log(`Total answers for accepted-mapping questions: ${answerCount}`);

  // Check if answers have a sheet_id we can use to filter UPM/Sappi
  const { data: sampleAnswerFull } = await supabase
    .from('answers')
    .select('id, question_id, sheet_id')
    .limit(3);
  console.log('\n=== Sample answers (id, question_id, sheet_id) ===');
  console.log(sampleAnswerFull);
}

main().catch(err => { console.error(err); process.exit(1); });

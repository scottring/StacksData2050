import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function main() {
  const sheetId = '5cedf833-8c7b-444e-af5e-c3c1f0f5e8f8';

  // Get answers with correct columns
  const { data, error } = await supabase
    .from('answers')
    .select('id, question_id, text_value, number_value, boolean_value')
    .eq('sheet_id', sheetId);

  console.log('Error:', error?.message || 'none');
  console.log('Total answers:', data?.length);

  if (!data) return;

  // Get Section 1 question IDs
  const { data: s1Questions } = await supabase
    .from('questions')
    .select('id, name, order_number, subsections!inner(order_number, sections!inner(order_number, name))')
    .eq('subsections.sections.order_number', 1);

  console.log('Section 1 questions found:', s1Questions?.length);

  const s1Map = new Map(s1Questions?.map(q => [q.id, q]) || []);

  // Match
  const s1Answers = data.filter(a => s1Map.has(a.question_id));
  console.log('Section 1 answers for BANSAN 500:', s1Answers.length);

  s1Answers.forEach(a => {
    const q = s1Map.get(a.question_id) as any;
    console.log(`  ${q?.name}: "${a.text_value || '(empty)'}"`);
  });

  // Also check: what section_sort_numbers does the VIEW have?
  const { data: viewSections } = await supabase
    .from('sheet_answers_display')
    .select('section_sort_number')
    .eq('sheet_id', sheetId);

  const secs = new Set(viewSections?.map(v => v.section_sort_number));
  console.log('\nSections in view:', Array.from(secs).sort());
}

main().catch(err => { console.error(err); process.exit(1); });

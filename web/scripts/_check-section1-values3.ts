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

  // Get ALL answers for this sheet
  const { data: allAnswers } = await supabase
    .from('answers')
    .select('id, question_id, text_value, text_area_value, number_value, boolean_value')
    .eq('sheet_id', sheetId);

  console.log(`Total answers in answers table: ${allAnswers?.length}`);

  // Get the Section 1 question IDs
  const { data: s1Questions } = await supabase
    .from('questions')
    .select('id, name, order_number, subsections!inner(sections!inner(order_number))')
    .eq('subsections.sections.order_number', 1);

  console.log(`Section 1 questions: ${s1Questions?.length}`);

  const s1Ids = new Set(s1Questions?.map(q => q.id) || []);

  const s1Answers = allAnswers?.filter(a => s1Ids.has(a.question_id)) || [];
  console.log(`Section 1 answers for this sheet: ${s1Answers.length}`);

  s1Answers.forEach(a => {
    const q = s1Questions?.find(q => q.id === a.question_id);
    const val = a.text_value || a.text_area_value || '(empty)';
    console.log(`  ${(q as any)?.name}: "${val}"`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });

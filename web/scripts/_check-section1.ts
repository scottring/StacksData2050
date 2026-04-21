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
  const { data } = await supabase
    .from('sheet_answers_display')
    .select('question_name, text_value, text_area_value, number_value, boolean_value, choice_content, section_sort_number, subsection_sort_number, question_order')
    .eq('sheet_id', sheetId)
    .eq('section_sort_number', 1)
    .order('question_order');

  console.log('=== SECTION 1: Product Information (BANSAN 500) ===');
  data?.forEach(a => {
    const val = a.text_value || a.text_area_value || a.choice_content || (a.boolean_value !== null ? String(a.boolean_value) : '') || (a.number_value !== null ? String(a.number_value) : '') || '(empty)';
    console.log(`  1.${a.subsection_sort_number}.${a.question_order} ${a.question_name}`);
    console.log(`    => ${val.substring(0, 120)}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });

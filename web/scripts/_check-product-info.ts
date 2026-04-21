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

  // Check sheet record
  const { data: sheet } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', sheetId)
    .single();

  console.log('=== SHEET RECORD ===');
  console.log('  name:', sheet?.name);
  console.log('  status:', sheet?.status);
  console.log('  company_id:', sheet?.company_id);
  console.log('  requesting_company_id:', sheet?.requesting_company_id);

  // Get company name
  if (sheet?.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', sheet.company_id)
      .single();
    console.log('  supplier:', company?.name);
  }
  if (sheet?.requesting_company_id) {
    const { data: req } = await supabase
      .from('companies')
      .select('name')
      .eq('id', sheet.requesting_company_id)
      .single();
    console.log('  customer:', req?.name);
  }

  // Check all distinct section_sort_numbers for this sheet
  const { data: answers } = await supabase
    .from('sheet_answers_display')
    .select('section_sort_number, question_name, text_value, text_area_value, choice_content')
    .eq('sheet_id', sheetId)
    .in('section_sort_number', [1])
    .limit(20);

  console.log('\n=== SECTION 1 ANSWERS ===');
  console.log('  Count:', answers?.length || 0);
  answers?.forEach(a => {
    const val = a.text_value || a.text_area_value || a.choice_content || '';
    console.log(`  ${a.question_name}: ${val.substring(0, 80)}`);
  });

  // Check orphaned (unmapped) answers
  const { data: allAnswers } = await supabase
    .from('sheet_answers_display')
    .select('id, question_name, section_sort_number, subsection_sort_number, question_order, text_value, text_area_value, choice_content')
    .eq('sheet_id', sheetId)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('question_order');

  // Get canonical links
  const answerIds = allAnswers?.map(a => a.id).filter(Boolean) || [];
  const allLinks: string[] = [];
  for (let i = 0; i < answerIds.length; i += 50) {
    const batch = answerIds.slice(i, i + 50);
    const { data: links } = await supabase
      .from('canonical_answer_links')
      .select('answer_id')
      .in('answer_id', batch);
    if (links) allLinks.push(...links.map(l => l.answer_id));
  }
  const linkedSet = new Set(allLinks);

  console.log('\n=== ORPHANED ANSWERS (not linked to canonical params) ===');
  allAnswers?.filter(a => !linkedSet.has(a.id)).forEach(a => {
    const val = a.text_value || a.text_area_value || a.choice_content || '';
    console.log(`  ${a.section_sort_number}.${a.subsection_sort_number}.${a.question_order} ${a.question_name}: ${val.substring(0, 60)}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });

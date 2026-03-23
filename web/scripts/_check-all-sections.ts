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

  // Get ALL answers for this sheet grouped by section
  const { data, count } = await supabase
    .from('sheet_answers_display')
    .select('section_sort_number, subsection_sort_number, question_order, question_name, text_value, text_area_value, choice_content, boolean_value', { count: 'exact' })
    .eq('sheet_id', sheetId)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('question_order');

  console.log(`Total answers: ${count}`);

  // Group by section
  const sections = new Map<number, number>();
  data?.forEach(a => {
    const sec = a.section_sort_number ?? -1;
    sections.set(sec, (sections.get(sec) || 0) + 1);
  });

  console.log('\n=== SECTIONS ===');
  Array.from(sections.entries()).sort((a, b) => a[0] - b[0]).forEach(([sec, count]) => {
    console.log(`  Section ${sec}: ${count} answers`);
  });

  // Show first 5 answers from each section
  console.log('\n=== FIRST 5 PER SECTION ===');
  const bySection = new Map<number, typeof data>();
  data?.forEach(a => {
    const sec = a.section_sort_number ?? -1;
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec)!.push(a);
  });

  Array.from(bySection.entries()).sort((a, b) => a[0] - b[0]).forEach(([sec, answers]) => {
    console.log(`\n  --- Section ${sec} (${answers.length} total) ---`);
    answers.slice(0, 5).forEach(a => {
      const val = a.text_value || a.text_area_value || a.choice_content || (a.boolean_value !== null ? String(a.boolean_value) : '') || '(empty)';
      console.log(`    ${a.section_sort_number}.${a.subsection_sort_number}.${a.question_order} ${a.question_name}: ${val.substring(0, 60)}`);
    });
  });

  // Also check what the edit page sees - it queries questions via tags
  console.log('\n\n=== EDIT PAGE VIEW (via tags) ===');
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId);

  console.log('Tags:', sheetTags?.map((t: any) => t.tags?.name).join(', '));

  const tagIds = sheetTags?.map(t => t.tag_id) || [];
  if (tagIds.length > 0) {
    const { data: qTags } = await supabase
      .from('question_tags')
      .select('question_id')
      .in('tag_id', tagIds);

    const qIds = [...new Set(qTags?.map(qt => qt.question_id) || [])];
    console.log(`Tagged questions: ${qIds.length}`);

    // Get section distribution of tagged questions
    const { data: questions } = await supabase
      .from('questions')
      .select('id, name, order_number, subsections(name, order_number, sections(name, order_number))')
      .in('id', qIds.slice(0, 50));

    const qSections = new Map<string, number>();
    questions?.forEach((q: any) => {
      const secName = q.subsections?.sections?.name || 'Unknown';
      const secOrder = q.subsections?.sections?.order_number || 0;
      const key = `${secOrder}. ${secName}`;
      qSections.set(key, (qSections.get(key) || 0) + 1);
    });

    console.log('\nQuestion sections:');
    Array.from(qSections.entries()).sort().forEach(([sec, count]) => {
      console.log(`  ${sec}: ${count} questions`);
    });
  }
}

main().catch(err => { console.error(err); process.exit(1); });

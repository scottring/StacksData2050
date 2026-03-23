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
  // Get Section 1 questions from HQ 2.0.1 tag
  const { data: tag } = await supabase
    .from('tags')
    .select('id')
    .eq('name', 'HQ 2.0.1')
    .single();

  if (!tag) { console.log('No HQ 2.0.1 tag found'); return; }

  const { data: qTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .eq('tag_id', tag.id);

  const qIds = qTags?.map(qt => qt.question_id) || [];

  // Get Section 1 questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, content, response_type, order_number, subsections(name, order_number, sections(name, order_number))')
    .in('id', qIds);

  const section1 = questions?.filter((q: any) => q.subsections?.sections?.order_number === 1) || [];
  section1.sort((a: any, b: any) => (a.order_number || 0) - (b.order_number || 0));

  console.log('=== SECTION 1: Product Information (HQ 2.0.1) ===');
  section1.forEach((q: any) => {
    console.log(`  1.${q.subsections?.order_number}.${q.order_number} ${q.name}`);
    console.log(`    type: ${q.response_type}`);
    if (q.content) console.log(`    content: ${q.content.substring(0, 80)}`);
  });

  // Also check HQ2.1 for comparison
  const { data: tag21 } = await supabase
    .from('tags')
    .select('id')
    .eq('name', 'HQ2.1')
    .single();

  if (tag21) {
    const { data: qTags21 } = await supabase
      .from('question_tags')
      .select('question_id')
      .eq('tag_id', tag21.id);

    const qIds21 = qTags21?.map(qt => qt.question_id) || [];
    const { data: questions21 } = await supabase
      .from('questions')
      .select('id, name, response_type, order_number, subsections(name, order_number, sections(name, order_number))')
      .in('id', qIds21);

    const section1_21 = questions21?.filter((q: any) => q.subsections?.sections?.order_number === 1) || [];
    section1_21.sort((a: any, b: any) => (a.order_number || 0) - (b.order_number || 0));

    console.log('\n=== SECTION 1: Product Information (HQ2.1) ===');
    section1_21.forEach((q: any) => {
      console.log(`  1.${q.subsections?.order_number}.${q.order_number} ${q.name}`);
      console.log(`    type: ${q.response_type}`);
    });
  }

  // Check if BANSAN 500 has any answers at all
  const sheetId = '5cedf833-8c7b-444e-af5e-c3c1f0f5e8f8';
  const { data: allAnswers, count } = await supabase
    .from('answers')
    .select('id, question_id', { count: 'exact' })
    .eq('sheet_id', sheetId);

  console.log(`\n=== BANSAN 500 answers: ${count} total ===`);

  // Check which of those answers map to section 1 questions
  const s1Ids = new Set(section1.map((q: any) => q.id));
  const s1Answers = allAnswers?.filter(a => s1Ids.has(a.question_id)) || [];
  console.log(`Section 1 answers: ${s1Answers.length}`);
  s1Answers.forEach(a => {
    const q = section1.find((q: any) => q.id === a.question_id);
    console.log(`  ${(q as any)?.name}: answer_id=${a.id}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });

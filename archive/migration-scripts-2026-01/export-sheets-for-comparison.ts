/**
 * Export 5 sheets with ALL answers for comparison with Bubble
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sheets = [
  { id: '1d971bc7-58d6-4d31-b496-dc3ae99dbaf1', name: 'Blankophor_P_liq_01', bubble: '1689768248880x479188149846409200' },
  { id: 'fbd7bce8-4fe2-4c75-b4ed-4f62767a996b', name: 'ND7231_SLURRY', bubble: '1671007026235x542610754152693760' },
  { id: '20935c02-278b-4c70-b767-2a58f862f6c3', name: 'COVERCARB_50_LV_72', bubble: '1708092850246x715931535684665300' },
  { id: '524c952f-1750-4705-849c-3c7b0a5fb6e5', name: 'FennoSil_EO_747E', bubble: '1673876195053x296656086242426900' },
  { id: '605c5788-710f-49e9-b668-50fd2af00581', name: 'Pentasize_8A', bubble: '1742477953065x246493352504066050' }
];

async function exportSheet(sheet: typeof sheets[0]) {
  const { data: answers, error } = await supabase
    .from('answers')
    .select(`
      id,
      text_value,
      number_value,
      boolean_value,
      choice_id,
      list_table_row_id,
      list_table_column_id,
      questions!inner(name, response_type, section_sort_number, subsection_sort_number, order_number),
      choices(content),
      list_table_columns(name, order_number)
    `)
    .eq('sheet_id', sheet.id);

  if (error) {
    console.error('Error for', sheet.name, error.message);
    return;
  }

  // Format the output
  const formatted = answers?.map((a: any) => ({
    question: a.questions?.name,
    section: a.questions?.section_sort_number || 0,
    subsection: a.questions?.subsection_sort_number || 0,
    order: a.questions?.order_number || 0,
    question_number: a.questions?.section_sort_number && a.questions?.subsection_sort_number && a.questions?.order_number
      ? `${a.questions.section_sort_number}.${a.questions.subsection_sort_number}.${a.questions.order_number}`
      : null,
    response_type: a.questions?.response_type,
    column: a.list_table_columns?.name || null,
    column_order: a.list_table_columns?.order_number || 0,
    row_id: a.list_table_row_id,
    answer: a.text_value || a.choices?.content || (a.number_value !== null ? String(a.number_value) : null) || (a.boolean_value !== null ? (a.boolean_value ? 'Yes' : 'No') : null)
  })).sort((a: any, b: any) => {
    // Sort by section, subsection, order (like Bubble)
    if (a.section !== b.section) return a.section - b.section;
    if (a.subsection !== b.subsection) return a.subsection - b.subsection;
    if (a.order !== b.order) return a.order - b.order;
    // For list tables: sort by row_id then column_order
    if (a.row_id !== b.row_id) return (a.row_id || '').localeCompare(b.row_id || '');
    return (a.column_order || 0) - (b.column_order || 0);
  }).map((a: any) => {
    // Remove sort helper fields from output
    const { section, subsection, order, ...rest } = a;
    return rest;
  });

  const filename = `sheet-exports/${sheet.name}.json`;
  fs.mkdirSync('sheet-exports', { recursive: true });
  fs.writeFileSync(filename, JSON.stringify({
    sheet_name: sheet.name,
    bubble_id: sheet.bubble,
    supabase_id: sheet.id,
    total_answers: formatted?.length || 0,
    answers: formatted
  }, null, 2));
  console.log(`Exported ${sheet.name}: ${formatted?.length} answers`);
}

async function main() {
  console.log('Exporting 5 sheets for Bubble comparison...\n');

  for (const sheet of sheets) {
    await exportSheet(sheet);
  }

  console.log('\nFiles saved to /stacks/sheet-exports/');
  console.log('\nBubble IDs to compare:');
  for (const sheet of sheets) {
    console.log(`  ${sheet.name}: ${sheet.bubble}`);
  }
}

main();

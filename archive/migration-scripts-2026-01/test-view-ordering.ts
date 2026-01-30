/**
 * Test the view with updated ordering
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function main() {
  // Test the view with a sample sheet
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name')
    .limit(1);

  if (sheets === null || sheets.length === 0) {
    console.log('No sheets found');
    return;
  }

  const sheetId = sheets[0].id;
  console.log('Testing sheet:', sheets[0].name);

  // Query the view
  const { data: answers, error } = await supabase
    .from('sheet_answers_display')
    .select('*')
    .eq('sheet_id', sheetId)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('question_order')
    .limit(25);

  if (error) {
    console.error('View error:', error.message);
    return;
  }

  console.log('\nFirst 25 answers from view:');
  answers?.forEach((a: any) => {
    const num = `${a.section_sort_number}.${a.subsection_sort_number}.${a.question_order}`;
    const qName = (a.question_name || 'N/A').substring(0, 45);
    const value = (a.text_value || a.choice_content || '').substring(0, 25) || '(empty)';
    console.log(`  ${num.padEnd(10)} ${qName.padEnd(47)} = ${value}`);
  });
}

main();

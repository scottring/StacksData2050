import { supabase } from './src/migration/supabase-client.js';

async function checkChoiceAnswers() {
  const supabaseSheetId = 'd594b54f-6170-4280-af1c-098ceb83a094';

  console.log('=== Checking Choice-Based Answers (3.1.2 - 3.1.8) ===\n');

  // Get questions 3.1.2 through 3.1.8
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, order_number')
    .eq('section_sort_number', '3')
    .eq('subsection_sort_number', '1')
    .gte('order_number', 2)
    .lte('order_number', 8)
    .order('order_number');

  for (const q of questions || []) {
    console.log(`Q 3.1.${q.order_number}: ${q.name?.substring(0, 60)}...`);

    // Get answers
    const { data: answers } = await supabase
      .from('answers')
      .select(`
        *,
        choices(name)
      `)
      .eq('sheet_id', supabaseSheetId)
      .eq('parent_question_id', q.id);

    console.log(`  Answers: ${answers?.length || 0}`);

    if (answers && answers.length > 0) {
      answers.forEach(a => {
        const choiceName = (a.choices as any)?.name;
        console.log(`    choice_id: ${a.choice_id}`);
        console.log(`    choice name: ${choiceName || '(NULL - CHOICE NOT FOUND)'}`);
        console.log(`    text_value: ${a.text_value || '(null)'}`);
      });
    }
    console.log('');
  }
}

checkChoiceAnswers().catch(console.error);

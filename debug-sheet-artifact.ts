import { supabase } from './src/migration/supabase-client.js';

async function debug() {
  // First check: How many answers have sheet_id populated?
  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  const { count: answersWithSheet } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('sheet_id', 'is', null);

  console.log(`Total answers: ${totalAnswers}`);
  console.log(`Answers with sheet_id: ${answersWithSheet}`);
  console.log(`Percentage: ${((answersWithSheet! / totalAnswers!) * 100).toFixed(1)}%\n`);

  // Get a sample answer with sheet_id
  const { data: sampleAnswer } = await supabase
    .from('answers')
    .select('id, sheet_id, answer_name, parent_question_id')
    .not('sheet_id', 'is', null)
    .limit(1)
    .single();

  console.log('Sample answer with sheet_id:');
  console.log(sampleAnswer);
  console.log('');

  if (sampleAnswer?.sheet_id) {
    // Try to get the sheet
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, name')
      .eq('id', sampleAnswer.sheet_id)
      .single();

    console.log('Sheet for this answer:');
    console.log(sheet);
    console.log('');

    // Try to get all answers for this sheet
    const { data: allAnswers, count } = await supabase
      .from('answers')
      .select('id, answer_name', { count: 'exact' })
      .eq('sheet_id', sampleAnswer.sheet_id);

    console.log(`Answers for sheet ${sheet?.name}: ${count}`);
    console.log('Sample answers:', allAnswers?.slice(0, 3));
  }
}

debug().catch(console.error);

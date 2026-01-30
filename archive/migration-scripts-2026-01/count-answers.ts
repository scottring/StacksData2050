import { supabase } from './src/migration/supabase-client.js';

async function count() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094';

  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId);

  console.log('Total answers for Hydrocarb sheet:', count);

  // Also check by question
  const { data: answers } = await supabase
    .from('answers')
    .select('parent_question_id')
    .eq('sheet_id', sheetId);

  const questionCounts = new Map();
  answers?.forEach(a => {
    const qid = a.parent_question_id;
    questionCounts.set(qid, (questionCounts.get(qid) || 0) + 1);
  });

  console.log(`\nAnswers grouped by question: ${questionCounts.size} unique questions`);
}

count().catch(console.error);

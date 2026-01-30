import { supabase } from './src/migration/supabase-client.js';

async function check() {
  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  const { count: answersWithSheet } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('sheet_id', 'is', null);

  console.log('Total answers:', totalAnswers);
  console.log('Answers with sheet_id:', answersWithSheet);
  console.log('Percentage:', ((answersWithSheet / totalAnswers) * 100).toFixed(2) + '%');

  // Get a sample
  const { data: sample } = await supabase
    .from('answers')
    .select('id, sheet_id, parent_question_id, company_id')
    .limit(10);

  console.log('\nSample answers:');
  sample.forEach(a => {
    console.log(`  sheet_id: ${a.sheet_id ? 'HAS' : 'NULL'}, question_id: ${a.parent_question_id ? 'HAS' : 'NULL'}, company_id: ${a.company_id ? 'HAS' : 'NULL'}`);
  });
}

check().catch(console.error);

import { supabase } from './src/migration/supabase-client.js';

async function check() {
  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  const { count: answersWithNumber } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('number_value', 'is', null);

  console.log('Total answers:', totalAnswers);
  console.log('Answers with number_value:', answersWithNumber);
  console.log('Percentage:', ((answersWithNumber / totalAnswers) * 100).toFixed(2) + '%');

  // Get some examples
  const { data: examples } = await supabase
    .from('answers')
    .select('id, bubble_id, number_value')
    .not('number_value', 'is', null)
    .limit(5);

  console.log('\nExamples:');
  examples.forEach(e => console.log('  ', e.number_value));
}

check().catch(console.error);

import { supabase } from './src/migration/supabase-client.js';

async function debug() {
  const sheetId = '6b9243a8-ab0f-44f7-8d7f-7cc52ec320af'; // FennoSil EO 645E

  console.log(`Querying answers for sheet: ${sheetId}\n`);

  const { data, error, count } = await supabase
    .from('answers')
    .select('id, answer_name, parent_question_id', { count: 'exact' })
    .eq('sheet_id', sheetId)
    .limit(5);

  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data:', data);
}

debug().catch(console.error);

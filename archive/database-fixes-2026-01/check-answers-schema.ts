import { supabase } from './src/migration/supabase-client.js';

async function check() {
  const { data } = await supabase
    .from('answers')
    .select('*')
    .limit(1)
    .single();

  console.log('Answers table columns:');
  if (data) {
    console.log(Object.keys(data).sort().join('\n'));
  }
}

check().catch(console.error);

import { supabase } from './src/migration/supabase-client.js';

async function checkChoiceStructure() {
  const { data } = await supabase.from('choices').select('*').limit(5);
  console.log('Choice table structure:');
  console.log(JSON.stringify(data, null, 2));
}

checkChoiceStructure().catch(console.error);

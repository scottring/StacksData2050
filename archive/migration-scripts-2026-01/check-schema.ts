import { supabase } from './src/migration/supabase-client.js';

async function checkSchema() {
  console.log('Checking table schemas...\n');
  
  // Check sections
  const { data: sections, error: sErr } = await supabase.from('sections').select('*').limit(1);
  console.log('sections:', sections ? Object.keys(sections[0]).join(', ') : sErr?.message);
  
  // Check choices
  const { data: choices, error: cErr } = await supabase.from('choices').select('*').limit(1);
  console.log('choices:', choices ? Object.keys(choices[0]).join(', ') : cErr?.message);
  
  // Check list_table_columns
  const { data: ltc, error: ltcErr } = await supabase.from('list_table_columns').select('*').limit(1);
  console.log('list_table_columns:', ltc ? Object.keys(ltc[0]).join(', ') : ltcErr?.message);
}

checkSchema().catch(console.error);

import { supabase } from './src/migration/supabase-client.js';

async function check() {
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, bubble_id')
    .limit(5);

  console.log('Sample sheets:');
  for (const s of sheets || []) {
    console.log(`  ID: ${s.id}`);
    console.log(`  Name: ${s.name}`);
    console.log(`  Company ID: ${s.company_id}`);
    console.log(`  Bubble ID: ${s.bubble_id}`);
    console.log('');
  }

  // Count sheets
  const { count } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true });

  console.log(`Total sheets: ${count}`);
}

check().catch(console.error);

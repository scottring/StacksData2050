import { supabase } from './src/migration/supabase-client.js';

async function check() {
  const { data } = await supabase
    .from('questions')
    .select('id, bubble_id, name, section_sort_number, subsection_sort_number, order_number')
    .eq('section_sort_number', '3')
    .eq('subsection_sort_number', '1')
    .order('order_number')
    .limit(5);

  console.log('Biocides section questions:\n');
  data?.forEach(q => {
    console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}: ${q.name?.substring(0, 60)}`);
    console.log(`  Bubble ID: ${q.bubble_id}\n`);
  });
}

check().catch(console.error);

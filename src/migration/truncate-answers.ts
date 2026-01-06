import { supabase } from './supabase-client.js';

async function truncateAnswers() {
  console.log('Truncating answer tables via DELETE...');
  
  // Delete all from each table
  console.log('Deleting from answer_text_choices...');
  const r1 = await supabase.from('answer_text_choices').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  console.log('Result:', r1.error?.message || 'OK');
  
  console.log('Deleting from answer_shareable_companies...');
  const r2 = await supabase.from('answer_shareable_companies').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  console.log('Result:', r2.error?.message || 'OK');
  
  console.log('Deleting from answers...');
  const r3 = await supabase.from('answers').delete().gte('id', '00000000-0000-0000-0000-000000000000');
  console.log('Result:', r3.error?.message || 'OK');
  
  console.log('Deleting answer id_mappings...');
  const r4 = await supabase.from('id_mappings').delete().eq('entity_type', 'answer');
  console.log('Result:', r4.error?.message || 'OK');
  
  console.log('Done! Checking count...');
  
  // Verify
  const { count } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  console.log(`Answers remaining: ${count}`);
}

truncateAnswers().catch(console.error);

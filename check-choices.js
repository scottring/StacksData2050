import { supabase } from './src/migration/supabase-client.js';

async function checkChoices() {
  // Check how many choices exist
  const { count: choiceCount } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true });

  console.log(`Total choices in database: ${choiceCount}`);

  // Get a sample of choices
  const { data: sampleChoices } = await supabase
    .from('choices')
    .select('id, bubble_id, choice_text')
    .limit(10);

  console.log('\nSample choices:');
  sampleChoices?.forEach(c => {
    console.log(`  ${c.bubble_id}: "${c.choice_text}"`);
  });

  // Check if specific choices exist
  const testChoices = ['Yes', 'No', 'Not assessed'];
  console.log('\nLooking for common choice values:');
  for (const text of testChoices) {
    const { data } = await supabase
      .from('choices')
      .select('id, bubble_id, choice_text')
      .eq('choice_text', text)
      .limit(1);

    if (data && data.length > 0) {
      console.log(`  "${text}" - Found: ${data[0].bubble_id}`);
    } else {
      console.log(`  "${text}" - NOT FOUND`);
    }
  }

  // Check ID mappings for choices
  const { count: mappingCount } = await supabase
    .from('_migration_id_map')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', 'choice');

  console.log(`\nTotal choice ID mappings: ${mappingCount}`);

  // Check a few sample answers with Choice field in JSON
  console.log('\nChecking what happened to Choice lookups:');
  const { data: answersWithChoiceText } = await supabase
    .from('answers')
    .select('id, bubble_id, choice_id, text_value')
    .in('bubble_id', [
      '1632742106809x485511659119968260',
      '1632742162660x422308077276758000',
      '1632742170871x176078988516524030'
    ]);

  console.log('Sample answers that should have choice_id:');
  answersWithChoiceText?.forEach(a => {
    console.log(`  ${a.bubble_id}: choice_id=${a.choice_id || 'NULL'}`);
  });
}

checkChoices().catch(console.error);

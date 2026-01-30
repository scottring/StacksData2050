import { supabase } from './src/migration/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔍 CHECKING CHOICE MAPPING STATE');
  console.log('='.repeat(80));

  // Check choices with bubble_id
  const { count: totalChoices } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true });

  const { count: choicesWithBubbleId } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
    .not('bubble_id', 'is', null);

  console.log(`\nChoices in Supabase: ${totalChoices}`);
  console.log(`Choices with bubble_id: ${choicesWithBubbleId}`);
  console.log(`Choices without bubble_id: ${(totalChoices || 0) - (choicesWithBubbleId || 0)}`);

  // Check _migration_id_map for choices
  const { count: choiceMappings } = await supabase
    .from('_migration_id_map')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', 'choice');

  console.log(`\nChoice mappings in _migration_id_map: ${choiceMappings}`);

  // Sample a few choices to see their state
  console.log('\nSample choices:');
  const { data: sampleChoices } = await supabase
    .from('choices')
    .select('id, bubble_id, content, parent_question_id')
    .limit(10);

  sampleChoices?.forEach(c => {
    console.log(`  ${c.id.substring(0, 8)}... bubble_id=${c.bubble_id ? c.bubble_id.substring(0, 20) + '...' : 'NULL'} "${c.content?.substring(0, 30)}..."`);
  });

  // Check how many answers have choices
  const { count: answersWithChoices } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('choice_id', 'is', null);

  console.log(`\nAnswers with choice_id: ${answersWithChoices}`);

  // Check if we can map via _migration_id_map
  const { data: sampleMappings } = await supabase
    .from('_migration_id_map')
    .select('bubble_id, supabase_id')
    .eq('entity_type', 'choice')
    .limit(10);

  console.log('\nSample choice mappings:');
  sampleMappings?.forEach(m => {
    console.log(`  ${m.bubble_id} -> ${m.supabase_id}`);
  });

  // RECOMMENDATION
  console.log('\n' + '='.repeat(80));
  console.log('ASSESSMENT:');

  if ((choiceMappings || 0) > 0 && choiceMappings! >= (totalChoices || 0) * 0.9) {
    console.log('✅ Choice ID mappings exist in _migration_id_map');
    console.log('   Can proceed with fix-answer-choice-ids.ts');
  } else if ((choicesWithBubbleId || 0) > 0 && choicesWithBubbleId! >= (totalChoices || 0) * 0.9) {
    console.log('✅ Choices have bubble_id field populated');
    console.log('   Can proceed with fix-answer-choice-ids.ts');
  } else {
    console.log('❌ Choice ID mappings are incomplete');
    console.log('   Need to re-migrate choices first to establish ID mappings');
    console.log('   Or rebuild _migration_id_map from choices.bubble_id field');
  }
}

main().catch(console.error);

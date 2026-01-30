import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { getSupabaseId } from './src/migration/id-mapper.js';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

async function debugSubsectionFKs() {
  const bubbleSheetId = '1636031591594x483952580354375700';

  console.log('=== Debugging Parent Subsection FK Issues ===\n');

  // Get sample answers from Bubble
  const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"}]&limit=20`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  const data: any = await response.json();
  const bubbleAnswers = data.response?.results || [];

  console.log(`Checking ${bubbleAnswers.length} sample answers...\n`);

  const subsectionIds = new Set<string>();

  for (const answer of bubbleAnswers) {
    const bubbleSubsectionId = answer['Parent Subsection'];
    if (bubbleSubsectionId) {
      subsectionIds.add(bubbleSubsectionId);
    }
  }

  console.log(`Found ${subsectionIds.size} unique Parent Subsection IDs in Bubble answers\n`);

  // Check each subsection ID
  for (const bubbleSubsectionId of subsectionIds) {
    console.log(`Bubble Subsection ID: ${bubbleSubsectionId}`);

    // Try to map it
    const supabaseId = await getSupabaseId(bubbleSubsectionId, 'subsection');
    console.log(`  Mapped to Supabase ID: ${supabaseId || 'NULL'}`);

    if (supabaseId) {
      // Check if it exists in subsections table
      const { data: subsection } = await supabase
        .from('subsections')
        .select('id, name, section_sort_number, order_number')
        .eq('id', supabaseId)
        .single();

      if (subsection) {
        console.log(`  ✓ Exists in subsections: "${subsection.name}" (${subsection.section_sort_number}.${subsection.order_number})`);
      } else {
        console.log(`  ❌ NOT FOUND in subsections table!`);
      }
    }

    console.log('');
  }

  // Also check: do answers even need parent_subsection_id?
  console.log('\n=== Checking if Parent Subsection is necessary ===');
  const { data: sampleAnswers } = await supabase
    .from('answers')
    .select('id, parent_question_id, parent_subsection_id')
    .not('parent_subsection_id', 'is', null)
    .limit(10);

  console.log(`Sample answers with parent_subsection_id: ${sampleAnswers?.length || 0}`);
  if (sampleAnswers && sampleAnswers.length > 0) {
    console.log('This field IS being used in existing answers');
  } else {
    console.log('This field is NOT used - we can skip it!');
  }
}

debugSubsectionFKs().catch(console.error);

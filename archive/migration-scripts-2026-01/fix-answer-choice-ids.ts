import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

/**
 * Fix Answer Choice IDs
 *
 * The answer migration used text-based matching instead of ID mapping,
 * causing answers to link to wrong choices. This script:
 *
 * 1. Fetches each answer with a choice from Bubble
 * 2. Gets the correct Bubble choice ID
 * 3. Maps it to the correct Supabase choice ID via _migration_id_map
 * 4. Updates the answer with the correct choice_id
 */

const DRY_RUN = process.env.DRY_RUN === 'true';

interface BubbleResponse<T> {
  response: T;
}

async function fetchBubbleById<T>(endpoint: string, id: string): Promise<T | null> {
  const url = `${BUBBLE_API_URL}/api/1.1/obj/${endpoint}/${id}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Bubble API error: ${response.status}`);
  const data = await response.json() as BubbleResponse<T>;
  return data.response;
}

async function getSupabaseChoiceIdByBubbleId(bubbleChoiceId: string): Promise<string | null> {
  // First check _migration_id_map
  const { data: mapping } = await supabase
    .from('_migration_id_map')
    .select('supabase_id')
    .eq('bubble_id', bubbleChoiceId)
    .eq('entity_type', 'choice')
    .single();

  if (mapping) {
    return mapping.supabase_id;
  }

  // Fallback: check choices table directly for bubble_id
  const { data: choice } = await supabase
    .from('choices')
    .select('id')
    .eq('bubble_id', bubbleChoiceId)
    .single();

  return choice?.id || null;
}

async function main() {
  console.log('🔧 FIX ANSWER CHOICE IDs');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log('='.repeat(80));

  // First, let's see how many answers have choice_id
  const { count: totalWithChoice } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('choice_id', 'is', null);

  console.log(`\nTotal answers with choice_id: ${totalWithChoice}`);

  // Get answers with choices in batches
  const BATCH_SIZE = 100;
  let offset = 0;
  let fixed = 0;
  let alreadyCorrect = 0;
  let notFoundInBubble = 0;
  let choiceMappingMissing = 0;
  let processed = 0;

  while (true) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id, bubble_id, choice_id, parent_question_id')
      .not('choice_id', 'is', null)
      .not('bubble_id', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (!answers || answers.length === 0) break;

    for (const answer of answers) {
      processed++;

      // Get the Bubble answer to find the correct choice
      const bubbleAnswer = await fetchBubbleById<any>('answer', answer.bubble_id);

      if (!bubbleAnswer) {
        notFoundInBubble++;
        continue;
      }

      const bubbleChoiceId = bubbleAnswer.Choice;

      if (!bubbleChoiceId) {
        // Answer has choice in Supabase but not in Bubble - unusual
        continue;
      }

      // Get the correct Supabase choice ID
      const correctChoiceId = await getSupabaseChoiceIdByBubbleId(bubbleChoiceId);

      if (!correctChoiceId) {
        choiceMappingMissing++;
        if (processed <= 10) {
          console.log(`  ⚠️  No Supabase mapping for Bubble choice ${bubbleChoiceId}`);
        }
        continue;
      }

      if (answer.choice_id === correctChoiceId) {
        alreadyCorrect++;
        continue;
      }

      // Need to fix this answer
      if (DRY_RUN) {
        if (fixed < 10) {
          console.log(`  [DRY RUN] Would update answer ${answer.id}`);
          console.log(`    Current choice_id: ${answer.choice_id}`);
          console.log(`    Correct choice_id: ${correctChoiceId}`);
        }
        fixed++;
      } else {
        const { error } = await supabase
          .from('answers')
          .update({ choice_id: correctChoiceId })
          .eq('id', answer.id);

        if (error) {
          console.log(`  ❌ Failed to update answer ${answer.id}: ${error.message}`);
        } else {
          fixed++;
        }
      }

      // Rate limiting for Bubble API
      await new Promise(r => setTimeout(r, 50));
    }

    offset += BATCH_SIZE;

    // Progress update
    if (processed % 500 === 0) {
      console.log(`Progress: ${processed}/${totalWithChoice} (${Math.round(processed / totalWithChoice! * 100)}%)`);
      console.log(`  Fixed: ${fixed}, Already correct: ${alreadyCorrect}, Missing mapping: ${choiceMappingMissing}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY:');
  console.log(`  Total processed: ${processed}`);
  console.log(`  Already correct: ${alreadyCorrect}`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Not found in Bubble: ${notFoundInBubble}`);
  console.log(`  Missing choice mapping: ${choiceMappingMissing}`);
  console.log('='.repeat(80));

  if (choiceMappingMissing > 0) {
    console.log('\n⚠️  WARNING: Some Bubble choices are missing from Supabase.');
    console.log('You may need to re-migrate choices first, then re-run this script.');
  }

  if (DRY_RUN && fixed > 0) {
    console.log(`\n💡 Run with DRY_RUN=false to apply ${fixed} fixes.`);
  }
}

main().catch(console.error);

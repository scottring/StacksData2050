import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;
const DRY_RUN = process.env.DRY_RUN !== 'false';

/**
 * Fix Answer Choice IDs - Batch Version
 *
 * Optimized approach:
 * 1. Preload all choice mappings (bubble_id -> supabase_id)
 * 2. Fetch answers from Bubble in batches
 * 3. Update Supabase in batches
 */

interface BubbleListResponse {
  response: {
    results: Array<{ _id: string; Choice?: string; [key: string]: unknown }>;
    remaining: number;
  };
}

// Preload all choice mappings
async function loadChoiceMappings(): Promise<Map<string, string>> {
  console.log('Loading choice mappings...');

  const mappings = new Map<string, string>();

  // From _migration_id_map
  const { data: idMapData } = await supabase
    .from('_migration_id_map')
    .select('bubble_id, supabase_id')
    .eq('entity_type', 'choice');

  idMapData?.forEach(row => {
    mappings.set(row.bubble_id, row.supabase_id);
  });

  // Also from choices.bubble_id (in case mapping table is incomplete)
  const { data: choicesData } = await supabase
    .from('choices')
    .select('id, bubble_id')
    .not('bubble_id', 'is', null);

  choicesData?.forEach(row => {
    if (row.bubble_id && !mappings.has(row.bubble_id)) {
      mappings.set(row.bubble_id, row.id);
    }
  });

  console.log(`Loaded ${mappings.size} choice mappings`);
  return mappings;
}

// Fetch Bubble answers in batches with constraints
async function fetchBubbleAnswersWithChoices(cursor: number, limit: number): Promise<{
  results: Array<{ _id: string; Choice: string }>;
  remaining: number;
}> {
  const url = new URL(`${BUBBLE_API_URL}/api/1.1/obj/answer`);
  // Only fetch answers that have a Choice field
  url.searchParams.set('constraints', JSON.stringify([
    { key: 'Choice', constraint_type: 'is_not_empty' }
  ]));
  url.searchParams.set('cursor', cursor.toString());
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  if (!response.ok) {
    throw new Error(`Bubble API error: ${response.status}`);
  }

  const data = await response.json() as BubbleListResponse;
  return {
    results: data.response.results.filter(a => a.Choice) as Array<{ _id: string; Choice: string }>,
    remaining: data.response.remaining
  };
}

// Load Supabase answer ID mapping
async function loadAnswerBubbleIdToSupabaseId(): Promise<Map<string, string>> {
  console.log('Loading answer ID mappings...');

  const mappings = new Map<string, string>();

  // Fetch in batches to avoid memory issues
  let offset = 0;
  const limit = 10000;

  while (true) {
    const { data } = await supabase
      .from('answers')
      .select('id, bubble_id')
      .not('bubble_id', 'is', null)
      .range(offset, offset + limit - 1);

    if (!data || data.length === 0) break;

    data.forEach(row => {
      mappings.set(row.bubble_id, row.id);
    });

    offset += limit;
    console.log(`  Loaded ${mappings.size} answer mappings...`);
  }

  console.log(`Total answer mappings: ${mappings.size}`);
  return mappings;
}

async function main() {
  console.log('🔧 FIX ANSWER CHOICE IDs - BATCH VERSION');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log('='.repeat(80));

  // Step 1: Load mappings
  const choiceMappings = await loadChoiceMappings();
  const answerMappings = await loadAnswerBubbleIdToSupabaseId();

  // Step 2: Process Bubble answers with choices
  console.log('\nFetching Bubble answers with choices...');

  let cursor = 0;
  const limit = 100;
  let totalProcessed = 0;
  let totalFixed = 0;
  let totalAlreadyCorrect = 0;
  let totalMissingMapping = 0;
  let totalMissingAnswer = 0;

  const updates: Array<{ id: string; choice_id: string }> = [];

  while (true) {
    const { results, remaining } = await fetchBubbleAnswersWithChoices(cursor, limit);

    for (const bubbleAnswer of results) {
      totalProcessed++;

      const bubbleChoiceId = bubbleAnswer.Choice;
      const correctChoiceId = choiceMappings.get(bubbleChoiceId);

      if (!correctChoiceId) {
        totalMissingMapping++;
        continue;
      }

      const supabaseAnswerId = answerMappings.get(bubbleAnswer._id);
      if (!supabaseAnswerId) {
        totalMissingAnswer++;
        continue;
      }

      // Check current value in Supabase
      const { data: currentAnswer } = await supabase
        .from('answers')
        .select('choice_id')
        .eq('id', supabaseAnswerId)
        .single();

      if (currentAnswer?.choice_id === correctChoiceId) {
        totalAlreadyCorrect++;
        continue;
      }

      // Need to fix
      updates.push({ id: supabaseAnswerId, choice_id: correctChoiceId });
      totalFixed++;

      if (updates.length < 5) {
        console.log(`  Would fix answer ${supabaseAnswerId.substring(0, 8)}...`);
        console.log(`    Current: ${currentAnswer?.choice_id}`);
        console.log(`    Correct: ${correctChoiceId}`);
      }
    }

    cursor += results.length;

    if (remaining === 0) break;

    // Progress
    if (totalProcessed % 1000 === 0) {
      console.log(`Progress: ${totalProcessed} processed, ${totalFixed} to fix, ${totalAlreadyCorrect} already correct`);
    }

    // Rate limit (Bubble API)
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS COMPLETE:');
  console.log(`  Total Bubble answers with choices: ${totalProcessed}`);
  console.log(`  Already correct in Supabase: ${totalAlreadyCorrect}`);
  console.log(`  Need fixing: ${totalFixed}`);
  console.log(`  Missing choice mapping: ${totalMissingMapping}`);
  console.log(`  Missing answer in Supabase: ${totalMissingAnswer}`);
  console.log('='.repeat(80));

  if (!DRY_RUN && updates.length > 0) {
    console.log(`\nApplying ${updates.length} fixes...`);

    // Update in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      for (const update of batch) {
        const { error } = await supabase
          .from('answers')
          .update({ choice_id: update.choice_id })
          .eq('id', update.id);

        if (error) {
          console.log(`  Error updating ${update.id}: ${error.message}`);
        }
      }

      console.log(`  Updated ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
    }

    console.log('\n✅ Fixes applied!');
  } else if (DRY_RUN && updates.length > 0) {
    console.log(`\n💡 Run with DRY_RUN=false to apply ${updates.length} fixes:`);
    console.log(`   DRY_RUN=false npx tsx fix-answer-choice-ids-batch.ts`);
  } else {
    console.log('\n✅ No fixes needed!');
  }
}

main().catch(console.error);

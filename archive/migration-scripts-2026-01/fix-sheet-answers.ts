import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { preloadCache, getSupabaseId } from './src/migration/id-mapper.js';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

interface BubbleAnswer {
  _id: string;
  Sheet?: string;
  'Parent Question'?: string;
  Choice?: string;
  'List Table Row'?: string;
  'List Table Column'?: string;
  text?: string;
  'text-area'?: string;
  Number?: number;
  Boolean?: boolean;
  Date?: string;
  Clarification?: string;
  Company?: string;
  Supplier?: string;
  customer?: string;
  'Created Date'?: string;
  'Modified Date'?: string;
  'Created By'?: string;
  Stack?: string;
  'Parent Subsection'?: string;
  'Originating Question'?: string;
}

/**
 * Fix answers for a specific sheet by re-fetching from Bubble
 *
 * Usage: npx tsx fix-sheet-answers.ts <bubble-sheet-id>
 * Example: npx tsx fix-sheet-answers.ts 1636031591594x483952580354375700
 */

async function fixSheetAnswers(bubbleSheetId: string) {
  console.log(`=== Fixing Answers for Sheet ${bubbleSheetId} ===\n`);

  // Step 1: Find the Supabase sheet ID
  console.log('Step 1: Looking up sheet in Supabase...');
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .eq('bubble_id', bubbleSheetId)
    .single();

  if (!sheet) {
    console.error(`❌ Sheet not found with Bubble ID: ${bubbleSheetId}`);
    return;
  }

  console.log(`✓ Found sheet: "${sheet.name}" (Supabase ID: ${sheet.id})\n`);

  // Step 2: Preload caches
  console.log('Step 2: Preloading ID mappings...');
  await preloadCache('question');
  await preloadCache('choice');
  await preloadCache('list_table_row');
  await preloadCache('list_table_column');
  await preloadCache('company');
  await preloadCache('user');
  await preloadCache('stack');
  await preloadCache('subsection');
  console.log('✓ Cache preloaded\n');

  // Step 3: Count existing answers
  const { count: existingCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheet.id);

  console.log(`Step 3: Current answers in Supabase: ${existingCount}\n`);

  // Step 4: Fetch answers from Bubble
  console.log('Step 4: Fetching answers from Bubble...');
  const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"}]&limit=500`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  const data: any = await response.json();

  if (!data.response) {
    console.error('❌ Failed to fetch from Bubble:', data);
    return;
  }

  const bubbleAnswers = data.response.results as BubbleAnswer[];
  console.log(`✓ Found ${bubbleAnswers.length} answers in Bubble\n`);

  // Step 5: Delete existing answers (in batches to avoid timeout)
  console.log('Step 5: Deleting existing answers from Supabase...');

  // Get all answer IDs first
  const { data: existingAnswers } = await supabase
    .from('answers')
    .select('id')
    .eq('sheet_id', sheet.id);

  if (existingAnswers && existingAnswers.length > 0) {
    const DELETE_BATCH = 50;
    let deleted = 0;

    for (let i = 0; i < existingAnswers.length; i += DELETE_BATCH) {
      const batch = existingAnswers.slice(i, i + DELETE_BATCH);
      const ids = batch.map(a => a.id);

      const { error: deleteError } = await supabase
        .from('answers')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error(`⚠️  Error deleting batch ${i / DELETE_BATCH + 1}:`, deleteError.message);
      } else {
        deleted += batch.length;
        console.log(`  ✓ Deleted batch ${i / DELETE_BATCH + 1}: ${batch.length} answers (total: ${deleted})`);
      }
    }

    console.log(`✓ Deleted ${deleted} existing answers\n`);
  } else {
    console.log('No existing answers to delete\n');
  }

  // Step 6: Transform and insert new answers
  console.log('Step 6: Inserting fresh answers from Bubble...');
  const transformed: any[] = [];
  let failed = 0;

  for (const bubble of bubbleAnswers) {
    try {
      const answer = await transformAnswer(bubble, sheet.id);
      transformed.push(answer);
    } catch (err: any) {
      console.error(`⚠️  Failed to transform answer ${bubble._id}:`, err.message);
      failed++;
    }
  }

  console.log(`Transformed ${transformed.length} answers (${failed} failed)\n`);

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
    const batch = transformed.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('answers')
      .insert(batch);

    if (error) {
      console.error(`❌ Failed to insert batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  ✓ Inserted batch ${i / BATCH_SIZE + 1}: ${batch.length} answers (total: ${inserted})`);
    }
  }

  console.log(`\n✓ Migration complete!`);
  console.log(`   Bubble: ${bubbleAnswers.length} answers`);
  console.log(`   Supabase before: ${existingCount} answers`);
  console.log(`   Supabase after: ${inserted} answers`);
  console.log(`   Failed: ${failed} answers`);

  // Step 7: Verify
  const { count: finalCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheet.id);

  console.log(`\nFinal verification: ${finalCount} answers in Supabase`);

  if (finalCount === bubbleAnswers.length) {
    console.log('✅ SUCCESS! Counts match perfectly.');
  } else {
    console.log(`⚠️  Warning: Mismatch detected (expected ${bubbleAnswers.length}, got ${finalCount})`);
  }
}

async function transformAnswer(bubble: BubbleAnswer, supabaseSheetId: string) {
  const parentQuestionId = await getSupabaseId(bubble['Parent Question'] || null, 'question');
  const choiceId = await getSupabaseId(bubble.Choice || null, 'choice');
  const listTableRowId = await getSupabaseId(bubble['List Table Row'] || null, 'list_table_row');
  const listTableColumnId = await getSupabaseId(bubble['List Table Column'] || null, 'list_table_column');
  const companyId = await getSupabaseId(bubble.Company || null, 'company');
  const supplierId = await getSupabaseId(bubble.Supplier || null, 'company');
  const customerId = await getSupabaseId(bubble.customer || null, 'user');
  const createdBy = await getSupabaseId(bubble['Created By'] || null, 'user');
  const stackId = await getSupabaseId(bubble.Stack || null, 'stack');
  const parentSubsectionId = await getSupabaseId(bubble['Parent Subsection'] || null, 'subsection');
  const originatingQuestionId = await getSupabaseId(bubble['Originating Question'] || null, 'question');

  return {
    bubble_id: bubble._id,
    sheet_id: supabaseSheetId,
    parent_question_id: parentQuestionId,
    originating_question_id: originatingQuestionId,
    choice_id: choiceId,
    list_table_row_id: listTableRowId,
    list_table_column_id: listTableColumnId,
    company_id: companyId,
    supplier_id: supplierId,
    customer_id: customerId,
    stack_id: stackId,
    parent_subsection_id: parentSubsectionId,
    text_value: bubble.text || null,
    text_area_value: bubble['text-area'] || null,
    number_value: bubble.Number || null,
    boolean_value: bubble.Boolean || null,
    date_value: bubble.Date || null,
    clarification: bubble.Clarification || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
  };
}

// Get sheet ID from command line
const bubbleSheetId = process.argv[2];

if (!bubbleSheetId) {
  console.error('Usage: npx tsx fix-sheet-answers.ts <bubble-sheet-id>');
  console.error('Example: npx tsx fix-sheet-answers.ts 1636031591594x483952580354375700');
  process.exit(1);
}

fixSheetAnswers(bubbleSheetId).catch(console.error);

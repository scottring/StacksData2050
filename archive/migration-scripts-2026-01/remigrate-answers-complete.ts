import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import dotenv from 'dotenv';
import { preloadCache, recordMappingsBatch, getSupabaseId } from './src/migration/id-mapper.js';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;
const BATCH_SIZE = 100;

interface BubbleAnswer {
  _id: string;
  Sheet?: string;
  'Parent Question'?: string;
  Choice?: string;
  'List Table Row'?: string;
  'List Table Column'?: string;
  text?: string;
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
}

/**
 * Complete answer re-migration script
 *
 * Steps:
 * 1. Backup existing answers
 * 2. Delete all answers from Supabase
 * 3. Fetch all answers from Bubble (paginated)
 * 4. Transform and insert with proper FK mappings
 * 5. Verify counts
 */

async function remigrate() {
  console.log('=== ANSWER RE-MIGRATION ===\n');
  console.log('This will take 30-60 minutes for 367k answers\n');

  // Step 1: Backup
  console.log('Step 1: Backing up existing answers...');
  const { data: existingAnswers } = await supabase
    .from('answers')
    .select('*')
    .limit(10000);

  await writeFile(
    './backup-answers-' + new Date().toISOString().split('T')[0] + '.json',
    JSON.stringify(existingAnswers, null, 2)
  );
  console.log('✓ Backed up first 10,000 answers to backup file\n');

  // Step 2: Delete existing answers
  console.log('Step 2: Deleting existing answers...');
  const { error: deleteError } = await supabase
    .from('answers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('❌ Failed to delete answers:', deleteError);
    return;
  }
  console.log('✓ Deleted all existing answers\n');

  // Step 3: Preload ID cache
  console.log('Step 3: Preloading ID mappings...');
  await preloadCache('sheet');
  await preloadCache('question');
  await preloadCache('choice');
  await preloadCache('list_table_row');
  await preloadCache('list_table_column');
  await preloadCache('company');
  await preloadCache('user');
  console.log('✓ Cache preloaded\n');

  // Step 4: Fetch and migrate answers
  console.log('Step 4: Fetching answers from Bubble...');
  let cursor = 0;
  let totalMigrated = 0;
  let totalFailed = 0;
  const limit = 100;

  while (true) {
    const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?cursor=${cursor}&limit=${limit}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    });

    const data: any = await response.json();

    if (!data.response || data.response.results.length === 0) {
      break;
    }

    const answers = data.response.results as BubbleAnswer[];

    // Transform batch
    const transformedBatch: any[] = [];
    for (const bubble of answers) {
      try {
        const transformed = await transformAnswer(bubble);
        transformedBatch.push(transformed);
      } catch (err) {
        totalFailed++;
      }
    }

    // Insert batch
    if (transformedBatch.length > 0) {
      const { error } = await supabase
        .from('answers')
        .insert(transformedBatch);

      if (error) {
        console.error(`❌ Failed to insert batch at cursor ${cursor}:`, error.message);
        totalFailed += transformedBatch.length;
      } else {
        totalMigrated += transformedBatch.length;

        // Record mappings for future lookups
        const mappings = transformedBatch.map(a => ({
          bubble_id: a.bubble_id,
          supabase_id: a.id,
          entity_type: 'answer'
        }));
        await recordMappingsBatch(mappings);
      }
    }

    cursor += limit;

    if (totalMigrated % 1000 === 0) {
      console.log(`Progress: ${totalMigrated} migrated, ${totalFailed} failed`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✓ Migration complete!`);
  console.log(`   Migrated: ${totalMigrated}`);
  console.log(`   Failed: ${totalFailed}`);

  // Step 5: Verify
  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  console.log(`\nFinal count in Supabase: ${count}`);
  console.log(`Expected: ~367,251`);
}

async function transformAnswer(bubble: BubbleAnswer) {
  const sheetId = await getSupabaseId(bubble.Sheet || null, 'sheet');
  const parentQuestionId = await getSupabaseId(bubble['Parent Question'] || null, 'question');
  const choiceId = await getSupabaseId(bubble.Choice || null, 'choice');
  const listTableRowId = await getSupabaseId(bubble['List Table Row'] || null, 'list_table_row');
  const listTableColumnId = await getSupabaseId(bubble['List Table Column'] || null, 'list_table_column');
  const companyId = await getSupabaseId(bubble.Company || null, 'company');
  const supplierId = await getSupabaseId(bubble.Supplier || null, 'company');
  const customerId = await getSupabaseId(bubble.customer || null, 'user');
  const createdBy = await getSupabaseId(bubble['Created By'] || null, 'user');

  return {
    bubble_id: bubble._id,
    sheet_id: sheetId,
    parent_question_id: parentQuestionId,
    choice_id: choiceId,
    list_table_row_id: listTableRowId,
    list_table_column_id: listTableColumnId,
    company_id: companyId,
    supplier_id: supplierId,
    customer_id: customerId,
    text_value: bubble.text || null,
    number_value: bubble.Number || null,
    boolean_value: bubble.Boolean || null,
    date_value: bubble.Date || null,
    clarification: bubble.Clarification || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
  };
}

remigrate().catch(console.error);

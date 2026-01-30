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
 * Fix answers for a sheet using UPSERT (updates existing, inserts new)
 */

async function fixSheetAnswersUpsert(bubbleSheetId: string) {
  console.log(`=== Fixing Answers for Sheet ${bubbleSheetId} ===\n`);

  // Step 1: Find sheet
  console.log('Step 1: Looking up sheet...');
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .eq('bubble_id', bubbleSheetId)
    .single();

  if (!sheet) {
    console.error(`❌ Sheet not found`);
    return;
  }

  console.log(`✓ Found: "${sheet.name}"\n`);

  // Step 2: Preload caches
  console.log('Step 2: Preloading caches...');
  await Promise.all([
    preloadCache('question'),
    preloadCache('choice'),
    preloadCache('list_table_row'),
    preloadCache('list_table_column'),
    preloadCache('company'),
    preloadCache('user'),
    preloadCache('stack'),
    preloadCache('subsection'),
  ]);
  console.log('✓ Cache loaded\n');

  // Step 3: Fetch from Bubble (with pagination)
  console.log('Step 3: Fetching from Bubble...');
  const bubbleAnswers: BubbleAnswer[] = [];
  let cursor = 0;
  const limit = 100;

  while (true) {
    const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"}]&cursor=${cursor}&limit=${limit}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    });

    const data: any = await response.json();
    const results = data.response?.results as BubbleAnswer[] || [];

    if (results.length === 0) break;

    bubbleAnswers.push(...results);
    cursor += limit;

    console.log(`  Fetched ${bubbleAnswers.length} answers so far...`);

    if (data.response?.remaining === 0) break;
  }

  console.log(`✓ Found ${bubbleAnswers.length} total answers\n`);

  // Step 4: Transform answers
  console.log('Step 4: Transforming answers...');
  const transformed: any[] = [];

  for (const bubble of bubbleAnswers) {
    try {
      const answer = await transformAnswer(bubble, sheet.id);
      transformed.push(answer);
    } catch (err: any) {
      console.error(`⚠️  Failed ${bubble._id}:`, err.message);
    }
  }

  console.log(`✓ Transformed ${transformed.length} answers\n`);

  // Step 5: Upsert in batches
  console.log('Step 5: Upserting to Supabase...');
  const BATCH_SIZE = 50;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
    const batch = transformed.slice(i, i + BATCH_SIZE);

    const { error, count } = await supabase
      .from('answers')
      .upsert(batch, {
        onConflict: 'bubble_id',
        count: 'exact'
      });

    if (error) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
      console.log(`  ✓ Batch ${i / BATCH_SIZE + 1}: ${batch.length} answers (total: ${upserted})`);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Upserted: ${upserted}`);
  console.log(`Errors: ${errors}`);

  // Verify
  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheet.id);

  console.log(`\nFinal count: ${count} answers`);
  console.log(`Expected: ${bubbleAnswers.length} answers`);

  if (count === bubbleAnswers.length) {
    console.log('\n✅ SUCCESS!');
  } else {
    console.log(`\n⚠️  Mismatch: ${bubbleAnswers.length - (count || 0)} answers missing`);
  }
}

async function transformAnswer(bubble: BubbleAnswer, sheetId: string) {
  const [
    parentQuestionId,
    choiceId,
    listTableRowId,
    listTableColumnId,
    companyId,
    supplierId,
    customerId,
    createdBy,
    stackId,
    parentSubsectionId,
    originatingQuestionId,
  ] = await Promise.all([
    getSupabaseId(bubble['Parent Question'] || null, 'question'),
    getSupabaseId(bubble.Choice || null, 'choice'),
    getSupabaseId(bubble['List Table Row'] || null, 'list_table_row'),
    getSupabaseId(bubble['List Table Column'] || null, 'list_table_column'),
    getSupabaseId(bubble.Company || null, 'company'),
    getSupabaseId(bubble.Supplier || null, 'company'),
    getSupabaseId(bubble.customer || null, 'user'),
    getSupabaseId(bubble['Created By'] || null, 'user'),
    getSupabaseId(bubble.Stack || null, 'stack'),
    getSupabaseId(bubble['Parent Subsection'] || null, 'subsection'),
    getSupabaseId(bubble['Originating Question'] || null, 'question'),
  ]);

  // Verify all FK fields actually exist in their respective tables
  // NOTE: Skip validation for list_table_rows and list_table_columns - these are sheet-specific
  // and may have been created by the sheet itself (not in master tables)
  const [
    validatedQuestionId,
    validatedOriginatingQuestionId,
    validatedChoiceId,
    validatedCompanyId,
    validatedSupplierId,
    validatedCustomerId,
    validatedStackId,
    validatedSubsectionId,
    validatedCreatedBy,
  ] = await Promise.all([
    parentQuestionId ? supabase.from('questions').select('id').eq('id', parentQuestionId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    originatingQuestionId ? supabase.from('questions').select('id').eq('id', originatingQuestionId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    choiceId ? supabase.from('choices').select('id').eq('id', choiceId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    companyId ? supabase.from('companies').select('id').eq('id', companyId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    supplierId ? supabase.from('companies').select('id').eq('id', supplierId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    customerId ? supabase.from('users').select('id').eq('id', customerId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    stackId ? supabase.from('stacks').select('id').eq('id', stackId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    parentSubsectionId ? supabase.from('subsections').select('id').eq('id', parentSubsectionId).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
    createdBy ? supabase.from('users').select('id').eq('id', createdBy).maybeSingle().then(r => r.data?.id || null) : Promise.resolve(null),
  ]);

  // Only include FK fields that were successfully resolved
  const result: any = {
    bubble_id: bubble._id,
    sheet_id: sheetId,
    text_value: bubble.text || null,
    text_area_value: bubble['text-area'] || null,
    number_value: bubble.Number || null,
    boolean_value: bubble.Boolean || null,
    date_value: bubble.Date || null,
    clarification: bubble.Clarification || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
  };

  // Only add FK fields if they were validated to exist (or are list table FKs which we trust)
  if (validatedQuestionId) result.parent_question_id = validatedQuestionId;
  if (validatedOriginatingQuestionId) result.originating_question_id = validatedOriginatingQuestionId;
  if (validatedChoiceId) result.choice_id = validatedChoiceId;
  if (listTableRowId) result.list_table_row_id = listTableRowId; // Trust list table row IDs
  if (listTableColumnId) result.list_table_column_id = listTableColumnId; // Trust list table column IDs
  if (validatedCompanyId) result.company_id = validatedCompanyId;
  if (validatedSupplierId) result.supplier_id = validatedSupplierId;
  if (validatedCustomerId) result.customer_id = validatedCustomerId;
  if (validatedStackId) result.stack_id = validatedStackId;
  if (validatedSubsectionId) result.parent_subsection_id = validatedSubsectionId;
  if (validatedCreatedBy) result.created_by = validatedCreatedBy;

  return result;
}

const bubbleSheetId = process.argv[2];
if (!bubbleSheetId) {
  console.error('Usage: npx tsx fix-sheet-answers-upsert.ts <bubble-sheet-id>');
  process.exit(1);
}

fixSheetAnswersUpsert(bubbleSheetId).catch(console.error);

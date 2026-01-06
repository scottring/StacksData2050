import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { supabase } from './supabase-client.js';
import { getSupabaseId, preloadCache, recordMappingsBatch, getChoiceIdByContent, preloadChoiceContentCache } from './id-mapper.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('AnswersImport');

const INPUT_FILE = '/Users/scottkaufman/Downloads/export_All-Answers-modified--_2025-12-27_08-33-43.json';
const BATCH_SIZE = 100;

interface BubbleAnswer {
  'unique id'?: string;
  _id?: string;
  'Creation Date'?: string;
  'Created Date'?: string;
  'Modified Date'?: string;
  Creator?: string;
  'Created By'?: string;
  Answer_name?: string;
  Answer_ID?: number | string;
  order?: number | string;
  Sheet?: string;
  Company?: string;
  Supplier?: string;
  customer?: string;
  'Originating Question'?: string;
  'Parent Question'?: string;
  'Parent Subsection'?: string;
  Stack?: string;
  text?: string;
  'text-area'?: string;
  Number?: number | string;
  Boolean?: boolean | string;
  Date?: string;
  File?: string;
  'Support File'?: string;
  Clarification?: string;
  Choice?: string;
  'Custom Comment Text'?: string;
  'Custom Inclusion Text'?: string;
  'Custom Row'?: string;
  'List Table Column'?: string;
  'List Table Row'?: string;
  'Version in sheet'?: number | string;
  'Version Copied'?: boolean | string;
  'Shareable with'?: string[] | string;
  Slug?: string;
}

async function transformAnswer(bubble: BubbleAnswer) {
  // Get the ID - prefer unique id from export, fallback to _id
  const bubbleId = bubble['unique id'] || bubble._id;
  if (!bubbleId) {
    throw new Error('Answer missing ID');
  }

  // Normalize empty strings to null for lookups
  const normalize = (val: any) => (val === '' || val === undefined || val === null) ? null : val;

  // Parallel FK lookups
  const [
    sheetId,
    companyId,
    supplierId,
    customerId,
    originatingQuestionId,
    parentQuestionId,
    createdBy,
    listTableColumnId,
    listTableRowId,
    stackId,
    parentSubsectionId,
  ] = await Promise.all([
    getSupabaseId(normalize(bubble.Sheet), 'sheet'),
    getSupabaseId(normalize(bubble.Company), 'company'),
    getSupabaseId(normalize(bubble.Supplier), 'company'),
    getSupabaseId(normalize(bubble.customer), 'user'),
    getSupabaseId(normalize(bubble['Originating Question']), 'question'),
    getSupabaseId(normalize(bubble['Parent Question']), 'question'),
    getSupabaseId(normalize(bubble.Creator || bubble['Created By']), 'user'),
    getSupabaseId(normalize(bubble['List Table Column']), 'list_table_column'),
    getSupabaseId(normalize(bubble['List Table Row']), 'list_table_row'),
    getSupabaseId(normalize(bubble.Stack), 'stack'),
    getSupabaseId(normalize(bubble['Parent Subsection']), 'subsection'),
  ]);

  // Choice lookup by text content (not bubble ID)
  const choiceId = getChoiceIdByContent(normalize(bubble.Choice));

  // Parse numeric values
  const parseNumber = (val: any) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? null : num;
  };

  // Parse boolean values
  const parseBoolean = (val: any) => {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === 'yes') return true;
      if (lower === 'false' || lower === 'no') return false;
    }
    return null;
  };

  return {
    bubble_id: bubbleId,
    answer_name: normalize(bubble.Answer_name),
    answer_id_number: parseNumber(bubble.Answer_ID),
    order_number: parseNumber(bubble.order),
    sheet_id: sheetId,
    company_id: companyId,
    supplier_id: supplierId,
    customer_id: customerId,
    originating_question_id: originatingQuestionId,
    parent_question_id: parentQuestionId,
    choice_id: choiceId,
    list_table_column_id: listTableColumnId,
    list_table_row_id: listTableRowId,
    stack_id: stackId,
    parent_subsection_id: parentSubsectionId,
    text_value: normalize(bubble.text),
    text_area_value: normalize(bubble['text-area']),
    number_value: parseNumber(bubble.Number),
    boolean_value: parseBoolean(bubble.Boolean),
    date_value: normalize(bubble.Date),
    file_url: normalize(bubble.File),
    support_file_url: normalize(bubble['Support File']),
    clarification: normalize(bubble.Clarification),
    custom_comment_text: normalize(bubble['Custom Comment Text']),
    custom_row_text: normalize(bubble['Custom Inclusion Text']),
    version_in_sheet: parseNumber(bubble['Version in sheet']),
    version_copied: parseBoolean(bubble['Version Copied']) ?? false,
    created_at: normalize(bubble['Creation Date'] || bubble['Created Date']),
    modified_at: normalize(bubble['Modified Date']),
    created_by: createdBy,
    slug: normalize(bubble.Slug),
  };
}

async function main() {
  logger.info('Starting answers import from JSON file...');
  logger.info(`File: ${INPUT_FILE}`);

  // Preload all caches
  logger.info('Preloading ID caches...');
  await Promise.all([
    preloadCache('sheet'),
    preloadCache('company'),
    preloadCache('user'),
    preloadCache('question'),
    preloadCache('list_table_column'),
    preloadCache('list_table_row'),
    preloadCache('stack'),
    preloadCache('subsection'),
    preloadChoiceContentCache(), // Special cache for choice content lookups
  ]);
  logger.info('Caches preloaded');

  // Read and parse JSON file
  logger.info('Reading JSON file...');
  const fs = await import('fs');
  const fileContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  const data = JSON.parse(fileContent);

  // Handle both array format and {results: [...]} format
  const answers: BubbleAnswer[] = Array.isArray(data) ? data : data.results || [];
  const total = answers.length;
  logger.info(`Found ${total} answers to import`);

  let imported = 0;
  let failed = 0;
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < answers.length; i += BATCH_SIZE) {
    const batch = answers.slice(i, i + BATCH_SIZE);

    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        // Transform all in parallel
        const transformed = await Promise.all(
          batch.map(a => transformAnswer(a).catch(err => {
            const id = a['unique id'] || a._id || 'unknown';
            if (err.message?.includes('SSL handshake') || err.message?.includes('525')) {
              logger.warn(`Transient SSL error for ${id}, will retry batch`);
              throw err; // Re-throw to trigger batch retry
            }
            logger.error(`Transform failed for ${id}:`, err.message);
            return null;
          }))
        );

        const validAnswers = transformed.filter(a => a !== null);

        if (validAnswers.length > 0) {
          // Bulk insert
          const { data: insertedData, error } = await supabase
            .from('answers')
            .insert(validAnswers)
            .select('id, bubble_id');

          if (error) {
            logger.error(`Batch insert failed:`, error);
            failed += batch.length;
          } else if (insertedData) {
            // Record mappings in bulk
            const mappings = insertedData.map(d => ({
              bubbleId: d.bubble_id,
              supabaseId: d.id,
            }));
            await recordMappingsBatch(mappings, 'answer');
            imported += insertedData.length;
          }
        } else {
          failed += batch.length;
        }
        break; // Success - exit retry loop

      } catch (err) {
        retries++;
        if (retries > maxRetries) {
          logger.error(`Batch error after ${maxRetries} retries:`, err instanceof Error ? err.message : err);
          failed += batch.length;
        } else {
          logger.warn(`Batch error, retry ${retries}/${maxRetries} in 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Progress
    const processed = i + batch.length;
    if (processed % 1000 === 0 || processed === total) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = Math.round(imported / elapsed);
      const eta = Math.round((total - processed) / rate / 60);
      logger.info(`Progress: ${processed}/${total} (${Math.round(processed/total*100)}%) | Rate: ${rate}/s | ETA: ${eta} min`);
    }
  }

  logger.success(`Import complete: ${imported} imported, ${failed} failed`);
}

main().catch(console.error);

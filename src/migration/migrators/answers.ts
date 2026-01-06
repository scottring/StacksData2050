import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import {
  isMigrated,
  recordMapping,
  recordMappingsBatch,
  getSupabaseId,
  getSupabaseIds,
  preloadCache,
} from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('AnswersMigrator');

interface BubbleAnswer extends BubbleRecord {
  Answer_name?: string;
  Answer_ID?: number;
  order?: number;
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
  Number?: number;
  Boolean?: boolean;
  Date?: string;
  File?: string;
  'Support File'?: string;
  'Support Text(not used here)'?: string;
  Clarification?: string;
  Choice?: string;
  'Custom Comment Text'?: string;
  'Custom Inclusion Text'?: string;
  'Custom Row'?: string;
  'List Table Column'?: string;
  'List Table Row'?: string;
  'Import Double Check'?: string;
  'Version in sheet'?: number;
  'Version Copied'?: boolean;
  enter_value?: string;
  'Shareable with'?: string[];
  'List of Text Choices'?: string[];
}

interface SupabaseAnswer {
  bubble_id: string;
  answer_name: string | null;
  answer_id_number: number | null;
  order_number: number | null;
  sheet_id: string | null;
  company_id: string | null;
  supplier_id: string | null;
  customer_id: string | null;
  originating_question_id: string | null;
  parent_question_id: string | null;
  choice_id: string | null;
  list_table_column_id: string | null;
  list_table_row_id: string | null;
  stack_id: string | null;
  parent_subsection_id: string | null;
  text_value: string | null;
  text_area_value: string | null;
  number_value: number | null;
  boolean_value: boolean | null;
  date_value: string | null;
  file_url: string | null;
  support_file_url: string | null;
  support_text: string | null;
  clarification: string | null;
  custom_comment_text: string | null;
  custom_row_text: string | null;
  import_double_check: string | null;
  version_in_sheet: number | null;
  version_copied: boolean;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
  slug: string | null;
}

async function transformAnswer(bubble: BubbleAnswer): Promise<SupabaseAnswer> {
  // Parallel FK lookups for speed (cache is preloaded)
  const [
    sheetId,
    companyId,
    supplierId,
    customerId,
    originatingQuestionId,
    parentQuestionId,
    createdBy,
    choiceId,
    listTableColumnId,
    listTableRowId,
    stackId,
    parentSubsectionId,
  ] = await Promise.all([
    getSupabaseId(bubble.Sheet, 'sheet'),
    getSupabaseId(bubble.Company, 'company'),
    getSupabaseId(bubble.Supplier, 'company'),
    getSupabaseId(bubble.customer, 'user'),
    getSupabaseId(bubble['Originating Question'], 'question'),
    getSupabaseId(bubble['Parent Question'], 'question'),
    getSupabaseId(bubble['Created By'], 'user'),
    getSupabaseId(bubble.Choice, 'choice'),
    getSupabaseId(bubble['List Table Column'], 'list_table_column'),
    getSupabaseId(bubble['List Table Row'], 'list_table_row'),
    getSupabaseId(bubble.Stack, 'stack'),
    getSupabaseId(bubble['Parent Subsection'], 'subsection'),
  ]);

  return {
    bubble_id: bubble._id,
    answer_name: bubble.Answer_name || null,
    answer_id_number: bubble.Answer_ID || null,
    order_number: bubble.order || null,
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
    text_value: bubble.text || null,
    text_area_value: bubble['text-area'] || null,
    number_value: bubble.Number || null,
    boolean_value: bubble.Boolean ?? null,
    date_value: bubble.Date || null,
    file_url: bubble.File || null,
    support_file_url: bubble['Support File'] || null,
    support_text: bubble['Support Text(not used here)'] || null,
    clarification: bubble.Clarification || null,
    custom_comment_text: bubble['Custom Comment Text'] || null,
    custom_row_text: bubble['Custom Inclusion Text'] || null,
    import_double_check: bubble['Import Double Check'] || null,
    version_in_sheet: bubble['Version in sheet'] || null,
    version_copied: bubble['Version Copied'] ?? false,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
    slug: bubble.Slug || null,
  };
}

async function migrateAnswerRelations(
  answerSupabaseId: string,
  bubble: BubbleAnswer
): Promise<void> {
  // Shareable with companies
  if (bubble['Shareable with'] && bubble['Shareable with'].length > 0) {
    const companyIds = await getSupabaseIds(bubble['Shareable with'], 'company');
    const entries = companyIds
      .filter((id): id is string => id !== null)
      .map(companyId => ({ answer_id: answerSupabaseId, company_id: companyId }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('answer_shareable_companies')
        .upsert(entries, { onConflict: 'answer_id,company_id' });

      if (error) {
        logger.warn(`Failed to insert answer_shareable_companies`, error);
      }
    }
  }

  // Text choices
  if (bubble['List of Text Choices'] && bubble['List of Text Choices'].length > 0) {
    const entries = bubble['List of Text Choices'].map((choice, index) => ({
      answer_id: answerSupabaseId,
      text_choice: choice,
      order_number: index,
    }));

    const { error } = await supabase
      .from('answer_text_choices')
      .insert(entries);

    if (error) {
      logger.warn(`Failed to insert answer_text_choices`, error);
    }
  }
}

export async function migrateAnswers(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting answers migration...');
  logger.info('This is the largest table (~367k records). This may take a while...');

  // Fresh start mode - use TRUNCATE for fast clearing
  if (config.migration.freshAnswers) {
    logger.info('FRESH_ANSWERS mode: Truncating answer tables...');

    // Use raw SQL TRUNCATE for much faster clearing
    const { error: truncateError } = await supabase.rpc('truncate_answer_tables');

    if (truncateError) {
      // Fallback: try direct SQL if RPC doesn't exist
      logger.warn('RPC not available, using direct DELETE with limit...');

      // Delete in larger batches with explicit count check
      for (const table of ['answer_text_choices', 'answer_shareable_companies', 'answers']) {
        logger.info(`Clearing ${table}...`);
        let totalDeleted = 0;
        let hasMore = true;

        while (hasMore) {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (!count || count === 0) {
            hasMore = false;
            break;
          }

          const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (error) {
            logger.error(`Error deleting from ${table}:`, error);
            break;
          }

          totalDeleted += Math.min(count, 10000);
          logger.info(`Deleted ~${totalDeleted} from ${table}...`);

          // Re-check count
          const { count: remaining } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          hasMore = (remaining || 0) > 0;
        }
        logger.info(`Finished clearing ${table}`);
      }

      // Clear answer id_mappings
      logger.info('Clearing answer id_mappings...');
      await supabase
        .from('_migration_id_map')
        .delete()
        .eq('entity_type', 'answer');
    } else {
      logger.info('Tables truncated successfully via RPC');
    }

    logger.info('Tables cleared for fresh start');
  }

  // Preload caches for faster lookups
  logger.info('Preloading ID caches...');
  await Promise.all([
    preloadCache('sheet'),
    preloadCache('company'),
    preloadCache('user'),
    preloadCache('question'),
    preloadCache('choice'),
    preloadCache('list_table_column'),
    preloadCache('list_table_row'),
    preloadCache('stack'),
    preloadCache('subsection'),
  ]);
  logger.info('ID caches preloaded');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('answer');

  logger.info(`Found ${total} answers to migrate`);

  let batchNumber = 0;
  const startTime = Date.now();

  for await (const batch of bubbleClient.iterateAll<BubbleAnswer>(
    'answer',
    config.migration.batchSize
  )) {
    batchNumber++;

    // Process in smaller sub-batches for database inserts
    const answersToInsert: SupabaseAnswer[] = [];
    const bubbleAnswersToProcess: BubbleAnswer[] = [];

    // In fresh mode, skip duplicate checks and transform in parallel
    if (config.migration.freshAnswers) {
      const transformPromises = batch.map(async (answer) => {
        try {
          return { answer, transformed: await transformAnswer(answer) };
        } catch (err) {
          stats.failed++;
          logger.error(`Failed to transform answer ${answer._id}`, err);
          return null;
        }
      });

      const results = await Promise.all(transformPromises);
      for (const result of results) {
        if (result) {
          answersToInsert.push(result.transformed);
          bubbleAnswersToProcess.push(result.answer);
        }
      }
    } else {
      // Non-fresh mode: sequential with duplicate checks
      for (const answer of batch) {
        try {
          if (await isMigrated(answer._id, 'answer')) {
            stats.skipped++;
            continue;
          }

          if (config.migration.dryRun) {
            stats.migrated++;
            continue;
          }

          const transformed = await transformAnswer(answer);
          answersToInsert.push(transformed);
          bubbleAnswersToProcess.push(answer);
        } catch (err) {
          stats.failed++;
          logger.error(`Failed to transform answer ${answer._id}`, err);
        }
      }
    }

    // Batch insert answers
    if (answersToInsert.length > 0) {
      try {
        const { data, error } = await supabase
          .from('answers')
          .insert(answersToInsert)
          .select('id, bubble_id');

        if (error) {
          // If batch insert fails, try one by one
          logger.warn(`Batch insert failed, falling back to individual inserts`, error);

          for (let i = 0; i < answersToInsert.length; i++) {
            try {
              const { data: singleData, error: singleError } = await supabase
                .from('answers')
                .insert(answersToInsert[i])
                .select('id')
                .single();

              if (singleError) {
                throw singleError;
              }

              await recordMapping(
                answersToInsert[i].bubble_id,
                singleData.id,
                'answer'
              );

              await migrateAnswerRelations(singleData.id, bubbleAnswersToProcess[i]);

              stats.migrated++;
            } catch (err) {
              stats.failed++;
              logger.error(`Failed to insert answer ${answersToInsert[i].bubble_id}`, err);
            }
          }
        } else if (data) {
          // Batch succeeded - record mappings in bulk
          const mappings = data.map(d => ({ bubbleId: d.bubble_id, supabaseId: d.id }));
          await recordMappingsBatch(mappings, 'answer');

          // Build lookup for bubble answers
          const bubbleMap = new Map(bubbleAnswersToProcess.map(a => [a._id, a]));

          // Collect all relation data for batch insert
          const shareableEntries: Array<{ answer_id: string; company_id: string }> = [];
          const textChoiceEntries: Array<{ answer_id: string; text_choice: string; order_number: number }> = [];

          for (const d of data) {
            const bubbleAnswer = bubbleMap.get(d.bubble_id);
            if (bubbleAnswer) {
              // Shareable companies
              if (bubbleAnswer['Shareable with']?.length) {
                const companyIds = await getSupabaseIds(bubbleAnswer['Shareable with'], 'company');
                for (const cid of companyIds) {
                  if (cid) shareableEntries.push({ answer_id: d.id, company_id: cid });
                }
              }
              // Text choices
              if (bubbleAnswer['List of Text Choices']?.length) {
                bubbleAnswer['List of Text Choices'].forEach((choice, idx) => {
                  textChoiceEntries.push({ answer_id: d.id, text_choice: choice, order_number: idx });
                });
              }
            }
          }

          // Batch insert relations
          if (shareableEntries.length > 0) {
            await supabase.from('answer_shareable_companies').upsert(shareableEntries, { onConflict: 'answer_id,company_id' });
          }
          if (textChoiceEntries.length > 0) {
            await supabase.from('answer_text_choices').insert(textChoiceEntries);
          }

          stats.migrated += data.length;
        }
      } catch (err) {
        stats.failed += answersToInsert.length;
        logger.error(`Critical error in batch insert`, err);
      }
    }

    // Progress reporting with ETA
    const processed = stats.migrated + stats.skipped + stats.failed;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = total - processed;
    const eta = remaining / rate;

    if (batchNumber % 10 === 0) {
      logger.info(
        `Progress: ${processed}/${total} (${Math.round((processed / total) * 100)}%) ` +
        `| Rate: ${Math.round(rate)}/s | ETA: ${Math.round(eta / 60)} min`
      );
    }

    logger.progress(processed, total, 'answers');
  }

  logger.success(
    `Answers migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

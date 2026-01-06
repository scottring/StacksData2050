import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('ChoicesMigrator');

interface BubbleChoice extends BubbleRecord {
  Content?: string;
  'Import Map'?: string;
  'Parent Question'?: string;
  Order?: number;
}

interface SupabaseChoice {
  bubble_id: string;
  content: string | null;
  import_map: string | null;
  parent_question_id: string | null;
  order_number: number | null;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
}

async function transformChoice(bubble: BubbleChoice): Promise<SupabaseChoice> {
  const parentQuestionId = await getSupabaseId(bubble['Parent Question'], 'question');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    content: bubble.Content || null,
    import_map: bubble['Import Map'] || null,
    parent_question_id: parentQuestionId,
    order_number: bubble.Order || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
  };
}

export async function migrateChoices(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting choices migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('choice');

  logger.info(`Found ${total} choices to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleChoice>(
    'choice',
    config.migration.batchSize
  )) {
    for (const choice of batch) {
      try {
        if (await isMigrated(choice._id, 'choice')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate choice: ${choice.Content}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformChoice(choice);

        const { data, error } = await supabase
          .from('choices')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(choice._id, data.id, 'choice');
        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate choice ${choice._id}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'choices');
  }

  logger.success(
    `Choices migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

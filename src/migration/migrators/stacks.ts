import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('StacksMigrator');

interface BubbleStack extends BubbleRecord {
  Name?: string;
  a_Association?: string;
  'List of Sections'?: string[];
  'a_Is Bundle'?: boolean;
}

interface SupabaseStack {
  bubble_id: string;
  name: string;
  is_bundle: boolean;
  association_id: string | null;
  created_at: string | null;
  modified_at: string | null;
}

async function transformStack(bubble: BubbleStack): Promise<SupabaseStack> {
  // Association will be linked after associations are migrated
  return {
    bubble_id: bubble._id,
    name: bubble.Name || 'Unknown Stack',
    is_bundle: bubble['a_Is Bundle'] ?? false,
    association_id: null, // Will be updated in second pass
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
  };
}

export async function migrateStacks(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting stacks migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('stack');

  logger.info(`Found ${total} stacks to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleStack>(
    'stack',
    config.migration.batchSize
  )) {
    for (const stack of batch) {
      try {
        if (await isMigrated(stack._id, 'stack')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate stack: ${stack.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformStack(stack);

        const { data, error } = await supabase
          .from('stacks')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(stack._id, data.id, 'stack');
        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate stack ${stack._id}: ${stack.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'stacks');
  }

  logger.success(
    `Stacks migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

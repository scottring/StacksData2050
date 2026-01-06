import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('SubsectionsMigrator');

interface BubbleSubsection extends BubbleRecord {
  Name?: string;
  'Show Tittle and Group'?: boolean;
  Section?: string;
  Order?: number;
}

interface SupabaseSubsection {
  bubble_id: string;
  name: string;
  show_title_and_group: boolean;
  section_id: string | null;
  order_number: number | null;
  created_at: string | null;
  modified_at: string | null;
}

async function transformSubsection(bubble: BubbleSubsection): Promise<SupabaseSubsection> {
  const sectionId = await getSupabaseId(bubble.Section, 'section');

  return {
    bubble_id: bubble._id,
    name: bubble.Name || 'Unknown Subsection',
    show_title_and_group: bubble['Show Tittle and Group'] ?? true,
    section_id: sectionId,
    order_number: bubble.Order || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
  };
}

export async function migrateSubsections(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting subsections migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('subsection');

  logger.info(`Found ${total} subsections to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleSubsection>(
    'subsection',
    config.migration.batchSize
  )) {
    for (const subsection of batch) {
      try {
        if (await isMigrated(subsection._id, 'subsection')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate subsection: ${subsection.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformSubsection(subsection);

        const { data, error } = await supabase
          .from('subsections')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(subsection._id, data.id, 'subsection');
        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate subsection ${subsection._id}: ${subsection.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'subsections');
  }

  logger.success(
    `Subsections migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

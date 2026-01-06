import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('AssociationsMigrator');

interface BubbleAssociation extends BubbleRecord {
  Name?: string;
  Active?: boolean;
  Companies?: string[];
}

interface SupabaseAssociation {
  bubble_id: string;
  name: string;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
}

async function transformAssociation(bubble: BubbleAssociation): Promise<SupabaseAssociation> {
  return {
    bubble_id: bubble._id,
    name: bubble.Name || 'Unknown Association',
    active: bubble.Active ?? true,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
  };
}

async function migrateAssociationCompanies(
  associationSupabaseId: string,
  companyBubbleIds: string[]
): Promise<void> {
  if (!companyBubbleIds || companyBubbleIds.length === 0) {
    return;
  }

  const companyIds = await getSupabaseIds(companyBubbleIds, 'company');

  const validEntries = companyIds
    .filter((id): id is string => id !== null)
    .map(companyId => ({
      association_id: associationSupabaseId,
      company_id: companyId,
    }));

  if (validEntries.length > 0) {
    const { error } = await supabase
      .from('association_companies')
      .upsert(validEntries, { onConflict: 'association_id,company_id' });

    if (error) {
      logger.warn(`Failed to insert association_companies for ${associationSupabaseId}`, error);
    }
  }
}

export async function migrateAssociations(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting associations migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('associations');

  logger.info(`Found ${total} associations to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleAssociation>(
    'associations',
    config.migration.batchSize
  )) {
    for (const association of batch) {
      try {
        if (await isMigrated(association._id, 'association')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate association: ${association.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformAssociation(association);

        const { data, error } = await supabase
          .from('associations')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(association._id, data.id, 'association');

        // Migrate company junction
        if (association.Companies) {
          await migrateAssociationCompanies(data.id, association.Companies);
        }

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate association ${association._id}: ${association.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'associations');
  }

  logger.success(
    `Associations migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

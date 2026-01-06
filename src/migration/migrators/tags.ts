import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('TagsMigrator');

interface BubbleTag extends BubbleRecord {
  Name?: string;
  Description?: string;
  Group?: number;
  'Company (will be used new architecture Arpil 2022)'?: string;
  'Custom Company'?: string;
  'Custom ACTIVE (N/U)'?: boolean;
  'Custom Any Can View'?: boolean;
  'Custom (N/U) Only If ReqORShared(not used)'?: boolean;
  'UX Not Show To These Companies'?: string[];
}

interface SupabaseTag {
  bubble_id: string;
  name: string;
  description: string | null;
  group_number: number | null;
  company_id: string | null;
  custom_company_id: string | null;
  custom_active: boolean;
  custom_any_can_see: boolean;
  custom_only_if_requested_or_shared: boolean;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
  slug: string | null;
}

async function transformTag(bubble: BubbleTag): Promise<SupabaseTag> {
  const companyId = await getSupabaseId(
    bubble['Company (will be used new architecture Arpil 2022)'],
    'company'
  );
  const customCompanyId = await getSupabaseId(bubble['Custom Company'], 'company');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    name: bubble.Name || 'Unknown Tag',
    description: bubble.Description || null,
    group_number: bubble.Group || null,
    company_id: companyId,
    custom_company_id: customCompanyId,
    custom_active: bubble['Custom ACTIVE (N/U)'] ?? false,
    custom_any_can_see: bubble['Custom Any Can View'] ?? false,
    custom_only_if_requested_or_shared: bubble['Custom (N/U) Only If ReqORShared(not used)'] ?? false,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
    slug: bubble.Slug || null,
  };
}

async function migrateTagHiddenCompanies(
  tagSupabaseId: string,
  hiddenCompanyBubbleIds: string[]
): Promise<void> {
  if (!hiddenCompanyBubbleIds || hiddenCompanyBubbleIds.length === 0) {
    return;
  }

  const companyIds = await getSupabaseIds(hiddenCompanyBubbleIds, 'company');

  const validEntries = companyIds
    .filter((id): id is string => id !== null)
    .map(companyId => ({
      tag_id: tagSupabaseId,
      company_id: companyId,
    }));

  if (validEntries.length > 0) {
    const { error } = await supabase
      .from('tag_hidden_companies')
      .upsert(validEntries, { onConflict: 'tag_id,company_id' });

    if (error) {
      logger.warn(`Failed to insert tag_hidden_companies for tag ${tagSupabaseId}`, error);
    }
  }
}

export async function migrateTags(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting tags migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('tag');

  logger.info(`Found ${total} tags to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleTag>(
    'tag',
    config.migration.batchSize
  )) {
    for (const tag of batch) {
      try {
        if (await isMigrated(tag._id, 'tag')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate tag: ${tag.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformTag(tag);

        const { data, error } = await supabase
          .from('tags')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(tag._id, data.id, 'tag');

        // Migrate hidden companies junction
        if (tag['UX Not Show To These Companies']) {
          await migrateTagHiddenCompanies(data.id, tag['UX Not Show To These Companies']);
        }

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate tag ${tag._id}: ${tag.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'tags');
  }

  logger.success(
    `Tags migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

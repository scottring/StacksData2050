import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('RequestsMigrator');

interface BubbleRequest extends BubbleRecord {
  'Product name'?: string;
  'Requesting company'?: string;
  'Supplier '?: string;
  Sheet?: string;
  Processed?: boolean;
  'Manufacturer Marked as Provided'?: boolean;
  'show as removed'?: boolean;
  'Comment Requestor'?: string;
  'Comment Supplier'?: string;
  'Creator Email'?: string;
  '1 First Shared'?: string;
  '1 Last share'?: string;
  '1 Days to First share'?: number;
  '1 Days to last share'?: number;
  '2 First Shared'?: string;
  '2 Last share'?: string;
  '2 Days to First share'?: number;
  '2 Days to last share'?: number;
  tags?: string[];
}

interface SupabaseRequest {
  bubble_id: string;
  product_name: string | null;
  requestor_id: string | null;
  requesting_from_id: string | null;
  sheet_id: string | null;
  processed: boolean;
  manufacturer_marked_as_provided: boolean;
  show_as_removed: boolean;
  comment_requestor: string | null;
  comment_supplier: string | null;
  creator_email: string | null;
  first_shared_date: string | null;
  last_share_date: string | null;
  days_to_first_share: number | null;
  days_to_last_share: number | null;
  first_shared_date_2: string | null;
  last_share_date_2: string | null;
  days_to_first_share_2: number | null;
  days_to_last_share_2: number | null;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
  slug: string | null;
}

async function transformRequest(bubble: BubbleRequest): Promise<SupabaseRequest> {
  const requestorId = await getSupabaseId(bubble['Requesting company'], 'company');
  const requestingFromId = await getSupabaseId(bubble['Supplier '], 'company');
  const sheetId = await getSupabaseId(bubble.Sheet, 'sheet');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    product_name: bubble['Product name'] || null,
    requestor_id: requestorId,
    requesting_from_id: requestingFromId,
    sheet_id: sheetId,
    processed: bubble.Processed ?? false,
    manufacturer_marked_as_provided: bubble['Manufacturer Marked as Provided'] ?? false,
    show_as_removed: bubble['show as removed'] ?? false,
    comment_requestor: bubble['Comment Requestor'] || null,
    comment_supplier: bubble['Comment Supplier'] || null,
    creator_email: bubble['Creator Email'] || null,
    first_shared_date: bubble['1 First Shared'] || null,
    last_share_date: bubble['1 Last share'] || null,
    days_to_first_share: bubble['1 Days to First share'] || null,
    days_to_last_share: bubble['1 Days to last share'] || null,
    first_shared_date_2: bubble['2 First Shared'] || null,
    last_share_date_2: bubble['2 Last share'] || null,
    days_to_first_share_2: bubble['2 Days to First share'] || null,
    days_to_last_share_2: bubble['2 Days to last share'] || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
    slug: bubble.Slug || null,
  };
}

async function migrateRequestTags(
  requestSupabaseId: string,
  tagBubbleIds: string[]
): Promise<void> {
  if (!tagBubbleIds || tagBubbleIds.length === 0) {
    return;
  }

  const tagIds = await getSupabaseIds(tagBubbleIds, 'tag');

  const validEntries = tagIds
    .filter((id): id is string => id !== null)
    .map(tagId => ({
      request_id: requestSupabaseId,
      tag_id: tagId,
    }));

  if (validEntries.length > 0) {
    const { error } = await supabase
      .from('request_tags')
      .upsert(validEntries, { onConflict: 'request_id,tag_id' });

    if (error) {
      logger.warn(`Failed to insert request_tags for request ${requestSupabaseId}`, error);
    }
  }
}

export async function migrateRequests(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting requests migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('request');

  logger.info(`Found ${total} requests to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleRequest>(
    'request',
    config.migration.batchSize
  )) {
    for (const request of batch) {
      try {
        if (await isMigrated(request._id, 'request')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate request: ${request['Product name']}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformRequest(request);

        const { data, error } = await supabase
          .from('requests')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(request._id, data.id, 'request');

        // Migrate tags junction
        if (request.tags) {
          await migrateRequestTags(data.id, request.tags);
        }

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate request ${request._id}: ${request['Product name']}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'requests');
  }

  logger.success(
    `Requests migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

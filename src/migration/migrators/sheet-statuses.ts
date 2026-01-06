import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('SheetStatusesMigrator');

interface BubbleSheetStatus extends BubbleRecord {
  'Sheet Name'?: string;
  Sheet?: string;
  Company?: string;
  Supplier?: string;
  'Father of Sheet'?: string;
  Status?: string;
  Completed?: boolean;
  'Complete Text'?: string;
  Observations?: string;
  Version?: number;
  'Father of Sheet Version (double check)'?: number;
  'Reminders count'?: number;
}

interface SupabaseSheetStatus {
  bubble_id: string;
  sheet_name: string | null;
  sheet_id: string | null;
  company_id: string | null;
  supplier_id: string | null;
  father_of_sheet_id: string | null;
  status: string | null;
  completed: boolean;
  complete_text: string | null;
  observations: string | null;
  version: number | null;
  father_of_sheet_version: number | null;
  reminders_count: number;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
  slug: string | null;
}

async function transformSheetStatus(bubble: BubbleSheetStatus): Promise<SupabaseSheetStatus> {
  const sheetId = await getSupabaseId(bubble.Sheet, 'sheet');
  const companyId = await getSupabaseId(bubble.Company, 'company');
  const supplierId = await getSupabaseId(bubble.Supplier, 'company');
  const fatherOfSheetId = await getSupabaseId(bubble['Father of Sheet'], 'sheet');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    sheet_name: bubble['Sheet Name'] || null,
    sheet_id: sheetId,
    company_id: companyId,
    supplier_id: supplierId,
    father_of_sheet_id: fatherOfSheetId,
    status: bubble.Status || null,
    completed: bubble.Completed ?? false,
    complete_text: bubble['Complete Text'] || null,
    observations: bubble.Observations || null,
    version: bubble.Version || null,
    father_of_sheet_version: bubble['Father of Sheet Version (double check)'] || null,
    reminders_count: bubble['Reminders count'] ?? 0,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
    slug: bubble.Slug || null,
  };
}

export async function migrateSheetStatuses(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting sheet statuses migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('sheetstatuses');

  logger.info(`Found ${total} sheet statuses to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleSheetStatus>(
    'sheetstatuses',
    config.migration.batchSize
  )) {
    for (const sheetStatus of batch) {
      try {
        if (await isMigrated(sheetStatus._id, 'sheet_status')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate sheet status: ${sheetStatus['Sheet Name']}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformSheetStatus(sheetStatus);

        const { data, error } = await supabase
          .from('sheet_statuses')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(sheetStatus._id, data.id, 'sheet_status');

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(
          `Failed to migrate sheet status ${sheetStatus._id}: ${sheetStatus['Sheet Name']}`,
          err
        );
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'sheet statuses');
  }

  logger.success(
    `Sheet statuses migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

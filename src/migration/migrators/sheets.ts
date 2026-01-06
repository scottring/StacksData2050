import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('SheetsMigrator');

interface BubbleSheet extends BubbleRecord {
  Name?: string;
  'Name Lower Case'?: string;
  Company?: string;
  'Sup Assigned to'?: string;
  'Original Requestor assoc'?: string;
  'Requestor Name'?: string;
  'Requestor Email'?: string;
  'Contact Profile'?: string;
  Stack?: string;
  'New Status'?: string;
  'New Name'?: boolean;
  'Unread Comment'?: boolean;
  'Mark as archived supplier'?: boolean;
  'Mark as a test sheet'?: boolean;
  'Test Being Deleted'?: boolean;
  Version?: number;
  'Version Lock'?: boolean;
  'Version Description'?: string;
  'Version Close Date'?: string;
  'Version Closed by'?: string;
  'Version Count Expected gets zeroed on edit visit'?: number;
  'Version Count Original'?: number;
  'Version Count Processed'?: number;
  'Version Father Sheet'?: string;
  'Version Prev. Sheet'?: string;
  'Imported file'?: string;
  'Imported processed'?: number;
  'Imported to process'?: number;
  'Count Col/Row'?: number;
  'Supplier Assignment Log'?: string[];
  'Shareable with '?: string[];
  Questions?: string[];
  'Supplier Users Assigned'?: string[];
  tags?: string[];
}

interface SupabaseSheet {
  bubble_id: string;
  name: string;
  name_lower_case: string | null;
  company_id: string | null;
  assigned_to_company_id: string | null;
  original_requestor_assoc_id: string | null;
  requestor_name: string | null;
  requestor_email: string | null;
  new_status: string | null;
  new_name: boolean;
  unread_comment: boolean;
  mark_as_archived: boolean;
  mark_as_test_sheet: boolean;
  test_being_deleted: boolean;
  version: number | null;
  version_lock: boolean;
  version_description: string | null;
  version_close_date: string | null;
  version_closed_by: string | null;
  version_count_expected: number | null;
  version_count_original: number | null;
  version_count_processed: number | null;
  imported_file_url: string | null;
  imported_processed: number | null;
  imported_to_process: number | null;
  current_number_of_col_row: number | null;
  supplier_assignment_log: string[] | null;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
  slug: string | null;
}

async function transformSheet(bubble: BubbleSheet): Promise<SupabaseSheet> {
  const companyId = await getSupabaseId(bubble.Company, 'company');
  const assignedToId = await getSupabaseId(bubble['Sup Assigned to'], 'company');
  const originalRequestorId = await getSupabaseId(bubble['Original Requestor assoc'], 'company');
  const versionClosedBy = await getSupabaseId(bubble['Version Closed by'], 'user');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    name: bubble.Name || 'Unnamed Sheet',
    name_lower_case: bubble['Name Lower Case'] || bubble.Name?.toLowerCase() || null,
    company_id: companyId,
    assigned_to_company_id: assignedToId,
    original_requestor_assoc_id: originalRequestorId,
    requestor_name: bubble['Requestor Name'] || null,
    requestor_email: bubble['Requestor Email'] || null,
    new_status: bubble['New Status'] || null,
    new_name: bubble['New Name'] ?? false,
    unread_comment: bubble['Unread Comment'] ?? false,
    mark_as_archived: bubble['Mark as archived supplier'] ?? false,
    mark_as_test_sheet: bubble['Mark as a test sheet'] ?? false,
    test_being_deleted: bubble['Test Being Deleted'] ?? false,
    version: bubble.Version || null,
    version_lock: bubble['Version Lock'] ?? false,
    version_description: bubble['Version Description'] || null,
    version_close_date: bubble['Version Close Date'] || null,
    version_closed_by: versionClosedBy,
    version_count_expected: bubble['Version Count Expected gets zeroed on edit visit'] || null,
    version_count_original: bubble['Version Count Original'] || null,
    version_count_processed: bubble['Version Count Processed'] || null,
    imported_file_url: bubble['Imported file'] || null,
    imported_processed: bubble['Imported processed'] || null,
    imported_to_process: bubble['Imported to process'] || null,
    current_number_of_col_row: bubble['Count Col/Row'] || null,
    supplier_assignment_log: bubble['Supplier Assignment Log'] || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
    slug: bubble.Slug || null,
  };
}

async function migrateSheetRelations(
  sheetSupabaseId: string,
  bubble: BubbleSheet
): Promise<void> {
  // Shareable with companies
  if (bubble['Shareable with '] && bubble['Shareable with '].length > 0) {
    const companyIds = await getSupabaseIds(bubble['Shareable with '], 'company');
    const entries = companyIds
      .filter((id): id is string => id !== null)
      .map(companyId => ({ sheet_id: sheetSupabaseId, company_id: companyId }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('sheet_shareable_companies')
        .upsert(entries, { onConflict: 'sheet_id,company_id' });

      if (error) {
        logger.warn(`Failed to insert sheet_shareable_companies`, error);
      }
    }
  }

  // Tags
  if (bubble.tags && bubble.tags.length > 0) {
    const tagIds = await getSupabaseIds(bubble.tags, 'tag');
    const entries = tagIds
      .filter((id): id is string => id !== null)
      .map(tagId => ({ sheet_id: sheetSupabaseId, tag_id: tagId }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('sheet_tags')
        .upsert(entries, { onConflict: 'sheet_id,tag_id' });

      if (error) {
        logger.warn(`Failed to insert sheet_tags`, error);
      }
    }
  }

  // Questions
  if (bubble.Questions && bubble.Questions.length > 0) {
    const questionIds = await getSupabaseIds(bubble.Questions, 'question');
    const entries = questionIds
      .filter((id): id is string => id !== null)
      .map((questionId, index) => ({
        sheet_id: sheetSupabaseId,
        question_id: questionId,
        order_number: index,
      }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('sheet_questions')
        .upsert(entries, { onConflict: 'sheet_id,question_id' });

      if (error) {
        logger.warn(`Failed to insert sheet_questions`, error);
      }
    }
  }

  // Supplier Users Assigned
  if (bubble['Supplier Users Assigned'] && bubble['Supplier Users Assigned'].length > 0) {
    const userIds = await getSupabaseIds(bubble['Supplier Users Assigned'], 'user');
    const entries = userIds
      .filter((id): id is string => id !== null)
      .map(userId => ({ sheet_id: sheetSupabaseId, user_id: userId }));

    if (entries.length > 0) {
      const { error } = await supabase
        .from('sheet_supplier_users_assigned')
        .upsert(entries, { onConflict: 'sheet_id,user_id' });

      if (error) {
        logger.warn(`Failed to insert sheet_supplier_users_assigned`, error);
      }
    }
  }
}

export async function migrateSheets(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting sheets migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('sheet');

  logger.info(`Found ${total} sheets to migrate`);

  // First pass: insert all sheets without self-references
  for await (const batch of bubbleClient.iterateAll<BubbleSheet>(
    'sheet',
    config.migration.batchSize
  )) {
    for (const sheet of batch) {
      try {
        if (await isMigrated(sheet._id, 'sheet')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate sheet: ${sheet.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformSheet(sheet);

        const { data, error } = await supabase
          .from('sheets')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(sheet._id, data.id, 'sheet');
        await migrateSheetRelations(data.id, sheet);

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate sheet ${sheet._id}: ${sheet.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'sheets');
  }

  // Second pass: update self-references (father_sheet_id, prev_sheet_id)
  logger.info('Updating sheet self-references...');

  for await (const batch of bubbleClient.iterateAll<BubbleSheet>(
    'sheet',
    config.migration.batchSize
  )) {
    for (const sheet of batch) {
      const hasFather = sheet['Version Father Sheet'];
      const hasPrev = sheet['Version Prev. Sheet'];

      if (!hasFather && !hasPrev) continue;

      try {
        const sheetSupabaseId = await getSupabaseId(sheet._id, 'sheet');
        if (!sheetSupabaseId) continue;

        const updates: Record<string, string | null> = {};

        if (hasFather) {
          const fatherId = await getSupabaseId(hasFather, 'sheet');
          if (fatherId) updates.father_sheet_id = fatherId;
        }

        if (hasPrev) {
          const prevId = await getSupabaseId(hasPrev, 'sheet');
          if (prevId) updates.prev_sheet_id = prevId;
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('sheets')
            .update(updates)
            .eq('id', sheetSupabaseId);

          if (error) {
            logger.warn(`Failed to update sheet self-references for ${sheet._id}`, error);
          }
        }
      } catch (err) {
        logger.warn(`Error updating sheet self-references for ${sheet._id}`, err);
      }
    }
  }

  logger.success(
    `Sheets migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

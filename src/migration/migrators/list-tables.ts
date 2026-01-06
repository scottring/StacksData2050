import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('ListTablesMigrator');

// List Tables
interface BubbleListTable extends BubbleRecord {
  Name?: string;
  Columns?: string[];
}

interface SupabaseListTable {
  bubble_id: string;
  name: string | null;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
}

// List Table Columns
interface BubbleListTableColumn extends BubbleRecord {
  Name?: string;
  'Response type'?: string;
  Order?: number;
  'Parent Table'?: string;
}

interface SupabaseListTableColumn {
  bubble_id: string;
  name: string;
  response_type: string | null;
  order_number: number | null;
  parent_table_id: string | null;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
}

// List Table Rows
interface BubbleListTableRow extends BubbleRecord {
  ID?: number;
  Table?: string;
}

interface SupabaseListTableRow {
  bubble_id: string;
  row_id: number | null;
  table_id: string | null;
  created_at: string | null;
  modified_at: string | null;
}

async function transformListTable(bubble: BubbleListTable): Promise<SupabaseListTable> {
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    name: bubble.Name || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
  };
}

async function transformListTableColumn(bubble: BubbleListTableColumn): Promise<SupabaseListTableColumn> {
  const parentTableId = await getSupabaseId(bubble['Parent Table'], 'list_table');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    name: bubble.Name || 'Unknown Column',
    response_type: bubble['Response type'] || null,
    order_number: bubble.Order || null,
    parent_table_id: parentTableId,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
  };
}

async function transformListTableRow(bubble: BubbleListTableRow): Promise<SupabaseListTableRow> {
  const tableId = await getSupabaseId(bubble.Table, 'list_table');

  return {
    bubble_id: bubble._id,
    row_id: bubble.ID || null,
    table_id: tableId,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
  };
}

export async function migrateListTables(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting list tables migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('listtable');

  logger.info(`Found ${total} list tables to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleListTable>(
    'listtable',
    config.migration.batchSize
  )) {
    for (const listTable of batch) {
      try {
        if (await isMigrated(listTable._id, 'list_table')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate list table: ${listTable.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformListTable(listTable);

        const { data, error } = await supabase
          .from('list_tables')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(listTable._id, data.id, 'list_table');
        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate list table ${listTable._id}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'list tables');
  }

  logger.success(
    `List tables migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

export async function migrateListTableColumns(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting list table columns migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('listtablecolumn');

  logger.info(`Found ${total} list table columns to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleListTableColumn>(
    'listtablecolumn',
    config.migration.batchSize
  )) {
    for (const column of batch) {
      try {
        if (await isMigrated(column._id, 'list_table_column')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate list table column: ${column.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformListTableColumn(column);

        const { data, error } = await supabase
          .from('list_table_columns')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(column._id, data.id, 'list_table_column');
        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate list table column ${column._id}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'list table columns');
  }

  logger.success(
    `List table columns migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

export async function migrateListTableRows(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting list table rows migration...');
  logger.info('This is a large table (~37k records). This may take a while...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('listtablerow');

  logger.info(`Found ${total} list table rows to migrate`);

  let batchNumber = 0;
  const startTime = Date.now();

  for await (const batch of bubbleClient.iterateAll<BubbleListTableRow>(
    'listtablerow',
    config.migration.batchSize
  )) {
    batchNumber++;
    const rowsToInsert: SupabaseListTableRow[] = [];

    for (const row of batch) {
      try {
        if (await isMigrated(row._id, 'list_table_row')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          stats.migrated++;
          continue;
        }

        const transformed = await transformListTableRow(row);
        rowsToInsert.push(transformed);
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to transform list table row ${row._id}`, err);
      }
    }

    // Batch insert
    if (rowsToInsert.length > 0) {
      try {
        const { data, error } = await supabase
          .from('list_table_rows')
          .insert(rowsToInsert)
          .select('id, bubble_id');

        if (error) {
          throw error;
        }

        if (data) {
          for (const item of data) {
            await recordMapping(item.bubble_id, item.id, 'list_table_row');
          }
          stats.migrated += data.length;
        }
      } catch (err) {
        stats.failed += rowsToInsert.length;
        logger.error(`Batch insert failed for list table rows`, err);
      }
    }

    // Progress with ETA
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

    logger.progress(processed, total, 'list table rows');
  }

  logger.success(
    `List table rows migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

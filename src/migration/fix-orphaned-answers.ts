import { readFileSync } from 'fs';
import { supabase } from './supabase-client.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('FixOrphanedAnswers');

const INPUT_FILE = '/Users/scottkaufman/Downloads/export_All-Answers-modified--_2025-12-27_08-33-43.json';
const BATCH_SIZE = 100;

async function fetchAllRows(table: string, select: string, filters?: { column: string; value: any; op?: string }[]) {
  const allRows: any[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    let query = supabase.from(table).select(select).range(offset, offset + limit - 1);

    if (filters) {
      for (const filter of filters) {
        if (filter.op === 'is') {
          query = query.is(filter.column, filter.value);
        } else {
          query = query.eq(filter.column, filter.value);
        }
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);
    offset += limit;

    if (data.length < limit) break;
  }

  return allRows;
}

async function main() {
  logger.info('=== Fix Orphaned Answers ===');
  logger.info('This script will fix answers with NULL sheet_id by matching sheet NAMES');

  // Step 1: Load ALL sheets from DB (name -> id mapping)
  logger.info('Loading sheets from database...');
  const sheets = await fetchAllRows('sheets', 'id, name');

  const sheetNameToUuid = new Map<string, string>();
  for (const sheet of sheets) {
    if (sheet.name) {
      sheetNameToUuid.set(sheet.name, sheet.id);
    }
  }
  logger.info(`Loaded ${sheetNameToUuid.size} sheet name->id mappings`);

  // Step 2: Parse JSON file
  logger.info('Loading and parsing JSON export...');
  const jsonContent = readFileSync(INPUT_FILE, 'utf-8');
  logger.info('File loaded, parsing JSON...');
  const answers: any[] = JSON.parse(jsonContent);
  logger.info(`Parsed ${answers.length} answers from JSON`);

  // Step 3: Build mapping from answer bubble_id -> sheet UUID (using name match)
  const answerBubbleToSheetUuid = new Map<string, string>();
  let skippedNoSheet = 0;
  let skippedNoSheetMapping = 0;
  let matchedCount = 0;

  for (const answer of answers) {
    const answerBubbleId = answer['unique id'] || answer._id;
    const sheetName = answer.Sheet; // This is actually the sheet NAME, not ID

    if (!answerBubbleId) continue;

    if (!sheetName || sheetName === '') {
      skippedNoSheet++;
      continue;
    }

    const sheetUuid = sheetNameToUuid.get(sheetName);
    if (!sheetUuid) {
      skippedNoSheetMapping++;
      continue;
    }

    answerBubbleToSheetUuid.set(answerBubbleId, sheetUuid);
    matchedCount++;
  }

  logger.info(`Built answer->sheet mapping:`);
  logger.info(`  - Mappable answers: ${answerBubbleToSheetUuid.size}`);
  logger.info(`  - Skipped (no Sheet in JSON): ${skippedNoSheet}`);
  logger.info(`  - Skipped (sheet name not found in DB): ${skippedNoSheetMapping}`);

  // Step 4: Get ALL orphaned answers from DB
  logger.info('Fetching orphaned answers from database...');
  const orphanedAnswers = await fetchAllRows('answers', 'id, bubble_id', [
    { column: 'sheet_id', value: null, op: 'is' }
  ]);

  logger.info(`Found ${orphanedAnswers.length} orphaned answers in DB`);

  // Step 5: Match orphaned answers with mappings
  const updates: { id: string; sheet_id: string }[] = [];
  let notFoundInMapping = 0;

  for (const answer of orphanedAnswers) {
    const sheetUuid = answerBubbleToSheetUuid.get(answer.bubble_id);
    if (sheetUuid) {
      updates.push({ id: answer.id, sheet_id: sheetUuid });
    } else {
      notFoundInMapping++;
    }
  }

  logger.info(`Matched ${updates.length} orphaned answers to sheets`);
  logger.info(`${notFoundInMapping} orphaned answers not found in JSON mapping`);

  if (updates.length === 0) {
    logger.info('No updates to perform');
    return;
  }

  // Step 6: Batch update
  logger.info(`Starting batch update of ${updates.length} answers...`);
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    // Update each record
    for (const update of batch) {
      const { error } = await supabase
        .from('answers')
        .update({ sheet_id: update.sheet_id })
        .eq('id', update.id);

      if (error) {
        errors++;
        if (errors <= 5) {
          logger.error(`Update failed for ${update.id}:`, error.message);
        }
      } else {
        updated++;
      }
    }

    const progress = Math.min(i + BATCH_SIZE, updates.length);
    if (progress % 5000 === 0 || progress >= updates.length) {
      logger.info(`Progress: ${progress}/${updates.length} (${updated} updated, ${errors} errors)`);
    }
  }

  logger.info('=== Complete ===');
  logger.info(`Updated: ${updated}`);
  logger.info(`Errors: ${errors}`);
  logger.info(`Remaining orphaned: ${orphanedAnswers.length - updated}`);
}

main().catch(console.error);

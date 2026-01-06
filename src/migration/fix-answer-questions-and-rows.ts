import { supabase } from './supabase-client.js';
import { createLogger } from './utils/logger.js';
import * as fs from 'fs';

const logger = createLogger('FixQuestionsAndRows');

const BATCH_SIZE = 1000;
const PAGINATION_SIZE = 1000;

// Caches for name-based lookups
const questionCache = new Map<string, string>();
const listTableRowCache = new Map<string, string>();

async function preloadCaches() {
  logger.info('Preloading lookup caches...');

  // Questions by content text (with correct column name)
  logger.info('Loading questions cache...');
  const { data: questions } = await supabase
    .from('questions')
    .select('id, content')
    .not('content', 'is', null);

  for (const q of questions || []) {
    if (q.content) {
      questionCache.set(q.content.toLowerCase().trim(), q.id);
    }
  }
  logger.info(`  Questions: ${questionCache.size}`);

  // List table rows by bubble_id (with pagination)
  logger.info('Loading list table rows cache...');
  let allRows: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: rows, error } = await supabase
      .from('list_table_rows')
      .select('id, bubble_id')
      .range(offset, offset + PAGINATION_SIZE - 1);

    if (error) {
      logger.error('Error loading rows:', error);
      break;
    }

    if (rows && rows.length > 0) {
      allRows = allRows.concat(rows);
      offset += rows.length;

      if (rows.length < PAGINATION_SIZE) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  for (const r of allRows) {
    if (r.bubble_id) {
      listTableRowCache.set(r.bubble_id, r.id);
    }
  }
  logger.info(`  List Table Rows: ${listTableRowCache.size}`);

  logger.info('Caches loaded!');
}

function normalize(val: any): string | null {
  if (val === '' || val === undefined || val === null) return null;
  return String(val).toLowerCase().trim();
}

async function main() {
  logger.info('Starting questions and rows FK fix for answers...');

  await preloadCaches();

  // Read JSON file
  logger.info('Reading JSON file...');
  const fileContent = fs.readFileSync('/Users/scottkaufman/Downloads/export_All-Answers-modified--_2025-12-27_08-33-43.json', 'utf-8');
  const data = JSON.parse(fileContent);
  const answers = Array.isArray(data) ? data : data.results || [];

  logger.info(`Found ${answers.length} answers in JSON`);

  // Build update map
  const updateMap = new Map<string, any>();
  let notFoundStats = {
    parentQuestion: 0,
    originatingQuestion: 0,
    listTableRow: 0,
  };

  for (const answer of answers) {
    const bubbleId = answer['unique id'] || answer._id;
    if (!bubbleId) continue;

    const update: any = {};

    // Parent Question (using content column)
    const parentQuestionText = normalize(answer['Parent Question']);
    if (parentQuestionText) {
      const questionId = questionCache.get(parentQuestionText);
      if (questionId) {
        update.parent_question_id = questionId;
      } else {
        notFoundStats.parentQuestion++;
      }
    }

    // Originating Question (using content column)
    const originatingQuestionText = normalize(answer['Originating Question']);
    if (originatingQuestionText) {
      const questionId = questionCache.get(originatingQuestionText);
      if (questionId) {
        update.originating_question_id = questionId;
      } else {
        notFoundStats.originatingQuestion++;
      }
    }

    // List Table Row (using bubble_id)
    const ltRowId = answer['List Table Row'];
    if (ltRowId && ltRowId !== '') {
      const rowId = listTableRowCache.get(ltRowId);
      if (rowId) {
        update.list_table_row_id = rowId;
      } else {
        notFoundStats.listTableRow++;
      }
    }

    // Only add to update map if we have at least one FK to update
    if (Object.keys(update).length > 0) {
      updateMap.set(bubbleId, update);
    }
  }

  logger.info('');
  logger.info('=== PREPARATION SUMMARY ===');
  logger.info(`Answers to update: ${updateMap.size}`);
  logger.info('');
  logger.info('Not found counts:');
  logger.info(`  Parent Question: ${notFoundStats.parentQuestion}`);
  logger.info(`  Originating Question: ${notFoundStats.originatingQuestion}`);
  logger.info(`  List Table Row: ${notFoundStats.listTableRow}`);
  logger.info('');

  // Now update in batches
  const bubbleIds = Array.from(updateMap.keys());
  let updated = 0;
  let errors = 0;

  logger.info('Starting batch updates...');

  for (let i = 0; i < bubbleIds.length; i += BATCH_SIZE) {
    const batchIds = bubbleIds.slice(i, i + BATCH_SIZE);

    const promises = batchIds.map(async (bubbleId) => {
      const updates = updateMap.get(bubbleId);
      if (!updates) return { success: false };

      const { error } = await supabase
        .from('answers')
        .update(updates)
        .eq('bubble_id', bubbleId);

      if (error) {
        return { success: false, error };
      }
      return { success: true };
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    updated += successCount;
    errors += results.length - successCount;

    const processed = Math.min(i + BATCH_SIZE, bubbleIds.length);
    if (processed % 10000 === 0 || processed === bubbleIds.length) {
      logger.info(`Progress: ${processed}/${bubbleIds.length} (${Math.round(processed/bubbleIds.length*100)}%) | Updated: ${updated} | Errors: ${errors}`);
    }
  }

  logger.success(`Fix complete! Updated: ${updated}, Errors: ${errors}`);
}

main().catch(console.error);

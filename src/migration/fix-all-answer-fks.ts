import { supabase } from './supabase-client.js';
import { createLogger } from './utils/logger.js';
import * as fs from 'fs';

const logger = createLogger('FixAllAnswerFKs');

const BATCH_SIZE = 1000;

// Caches for name-based lookups
const companyCache = new Map<string, string>();
const userCache = new Map<string, string>();
const questionCache = new Map<string, string>();
const subsectionCache = new Map<string, string>();
const stackCache = new Map<string, string>();
const listTableColumnCache = new Map<string, string>();
const listTableRowCache = new Map<string, string>();

async function preloadCaches() {
  logger.info('Preloading lookup caches...');

  // Companies by name
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name');
  for (const c of companies || []) {
    if (c.name) {
      companyCache.set(c.name.toLowerCase().trim(), c.id);
    }
  }
  logger.info(`  Companies: ${companyCache.size}`);

  // Users by email
  const { data: users } = await supabase
    .from('users')
    .select('id, email');
  for (const u of users || []) {
    if (u.email) {
      userCache.set(u.email.toLowerCase().trim(), u.id);
    }
  }
  logger.info(`  Users: ${userCache.size}`);

  // Questions by text (trimmed and lowercased)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_text');
  for (const q of questions || []) {
    if (q.question_text) {
      questionCache.set(q.question_text.toLowerCase().trim(), q.id);
    }
  }
  logger.info(`  Questions: ${questionCache.size}`);

  // Subsections by name
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name');
  for (const s of subsections || []) {
    if (s.name) {
      subsectionCache.set(s.name.toLowerCase().trim(), s.id);
    }
  }
  logger.info(`  Subsections: ${subsectionCache.size}`);

  // Stacks by name
  const { data: stacks } = await supabase
    .from('stacks')
    .select('id, name');
  for (const s of stacks || []) {
    if (s.name) {
      stackCache.set(s.name.toLowerCase().trim(), s.id);
    }
  }
  logger.info(`  Stacks: ${stackCache.size}`);

  // List table columns by bubble_id
  const { data: ltColumns } = await supabase
    .from('list_table_columns')
    .select('id, bubble_id');
  for (const c of ltColumns || []) {
    if (c.bubble_id) {
      listTableColumnCache.set(c.bubble_id, c.id);
    }
  }
  logger.info(`  List Table Columns: ${listTableColumnCache.size}`);

  // List table rows by bubble_id
  const { data: ltRows } = await supabase
    .from('list_table_rows')
    .select('id, bubble_id');
  for (const r of ltRows || []) {
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
  logger.info('Starting comprehensive FK fix for answers...');

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
    company: 0,
    supplier: 0,
    customer: 0,
    parentQuestion: 0,
    originatingQuestion: 0,
    creator: 0,
    subsection: 0,
    stack: 0,
    listTableColumn: 0,
    listTableRow: 0,
  };

  for (const answer of answers) {
    const bubbleId = answer['unique id'] || answer._id;
    if (!bubbleId) continue;

    const update: any = {};

    // Company
    const companyName = normalize(answer.Company);
    if (companyName) {
      const companyId = companyCache.get(companyName);
      if (companyId) {
        update.company_id = companyId;
      } else {
        notFoundStats.company++;
      }
    }

    // Supplier
    const supplierName = normalize(answer.Supplier);
    if (supplierName) {
      const supplierId = companyCache.get(supplierName);
      if (supplierId) {
        update.supplier_id = supplierId;
      } else {
        notFoundStats.supplier++;
      }
    }

    // Customer (user email)
    const customerEmail = normalize(answer.customer);
    if (customerEmail) {
      const customerId = userCache.get(customerEmail);
      if (customerId) {
        update.customer_id = customerId;
      } else {
        notFoundStats.customer++;
      }
    }

    // Parent Question
    const parentQuestionText = normalize(answer['Parent Question']);
    if (parentQuestionText) {
      const questionId = questionCache.get(parentQuestionText);
      if (questionId) {
        update.parent_question_id = questionId;
      } else {
        notFoundStats.parentQuestion++;
      }
    }

    // Originating Question
    const originatingQuestionText = normalize(answer['Originating Question']);
    if (originatingQuestionText) {
      const questionId = questionCache.get(originatingQuestionText);
      if (questionId) {
        update.originating_question_id = questionId;
      } else {
        notFoundStats.originatingQuestion++;
      }
    }

    // Creator (user email)
    const creatorEmail = normalize(answer.Creator || answer['Created By']);
    if (creatorEmail) {
      const creatorId = userCache.get(creatorEmail);
      if (creatorId) {
        update.created_by = creatorId;
      } else {
        notFoundStats.creator++;
      }
    }

    // Parent Subsection
    const subsectionName = normalize(answer['Parent Subsection']);
    if (subsectionName) {
      const subsectionId = subsectionCache.get(subsectionName);
      if (subsectionId) {
        update.parent_subsection_id = subsectionId;
      } else {
        notFoundStats.subsection++;
      }
    }

    // Stack
    const stackName = normalize(answer.Stack);
    if (stackName) {
      const stackId = stackCache.get(stackName);
      if (stackId) {
        update.stack_id = stackId;
      } else {
        notFoundStats.stack++;
      }
    }

    // List Table Column (uses bubble_id)
    const ltColumnId = answer['List Table Column'];
    if (ltColumnId && ltColumnId !== '') {
      const columnId = listTableColumnCache.get(ltColumnId);
      if (columnId) {
        update.list_table_column_id = columnId;
      } else {
        notFoundStats.listTableColumn++;
      }
    }

    // List Table Row (uses bubble_id)
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
  logger.info(`  Company: ${notFoundStats.company}`);
  logger.info(`  Supplier: ${notFoundStats.supplier}`);
  logger.info(`  Customer: ${notFoundStats.customer}`);
  logger.info(`  Parent Question: ${notFoundStats.parentQuestion}`);
  logger.info(`  Originating Question: ${notFoundStats.originatingQuestion}`);
  logger.info(`  Creator: ${notFoundStats.creator}`);
  logger.info(`  Subsection: ${notFoundStats.subsection}`);
  logger.info(`  Stack: ${notFoundStats.stack}`);
  logger.info(`  List Table Column: ${notFoundStats.listTableColumn}`);
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

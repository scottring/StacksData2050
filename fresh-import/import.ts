/**
 * Fresh Import Script for Stacks Data
 *
 * One-time migration from Bubble to clean Supabase schema.
 *
 * Key behaviors:
 * - Filters to LATEST VERSION of each sheet per product/supplier
 * - Builds in-memory ID map (discarded after import)
 * - Inserts in dependency order
 * - Only imports answers for latest-version sheets
 *
 * Run: npx tsx fresh-import/import.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');
const DRY_RUN = process.env.DRY_RUN === 'true';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================================
// In-Memory ID Mapping (not persisted)
// ============================================================================

type EntityType = 'company' | 'user' | 'section' | 'subsection' | 'question' |
                  'choice' | 'tag' | 'sheet' | 'answer' | 'list_table_column';

const idMap = new Map<string, Map<string, string>>(); // entityType -> bubbleId -> supabaseId

function initIdMap() {
  const types: EntityType[] = ['company', 'user', 'section', 'subsection', 'question',
                               'choice', 'tag', 'sheet', 'answer', 'list_table_column'];
  types.forEach(t => idMap.set(t, new Map()));
}

function recordId(bubbleId: string | undefined, supabaseId: string, entityType: EntityType) {
  if (!bubbleId) return;
  idMap.get(entityType)!.set(bubbleId, supabaseId);
}

function getId(bubbleId: string | undefined | null, entityType: EntityType): string | null {
  if (!bubbleId) return null;
  return idMap.get(entityType)?.get(bubbleId) || null;
}

// ============================================================================
// Bubble API Client
// ============================================================================

interface BubbleResponse<T> {
  response: {
    cursor: number;
    results: T[];
    count: number;
    remaining: number;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBubble<T>(
  entityType: string,
  cursor = 0,
  limit = 100,
  constraints?: object[]
): Promise<{ results: T[]; remaining: number }> {
  const url = new URL(`${BUBBLE_API_URL}/api/1.1/obj/${entityType}`);
  url.searchParams.set('cursor', cursor.toString());
  url.searchParams.set('limit', limit.toString());

  if (constraints && constraints.length > 0) {
    url.searchParams.set('constraints', JSON.stringify(constraints));
  }

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  if (response.status === 429) {
    console.log('  Rate limited, waiting 5s...');
    await sleep(5000);
    return fetchBubble(entityType, cursor, limit, constraints);
  }

  if (!response.ok) {
    throw new Error(`Bubble API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as BubbleResponse<T>;
  return { results: data.response.results, remaining: data.response.remaining };
}

async function* fetchAll<T>(entityType: string, constraints?: object[]): AsyncGenerator<T> {
  let cursor = 0;
  let remaining = 1;

  while (remaining > 0) {
    const { results, remaining: r } = await fetchBubble<T>(entityType, cursor, BATCH_SIZE, constraints);
    remaining = r;
    cursor += results.length;

    for (const item of results) {
      yield item;
    }

    if (remaining > 0) {
      await sleep(50); // Rate limiting
    }
  }
}

async function countBubble(entityType: string): Promise<number> {
  const { remaining } = await fetchBubble(entityType, 0, 1);
  return remaining + 1;
}

// ============================================================================
// Bubble Data Types
// ============================================================================

interface BubbleCompany {
  _id: string;
  'Company Name'?: string;
  'Created Date'?: string;
}

interface BubbleUser {
  _id: string;
  email?: string;
  'Full Name'?: string;
  'First Name'?: string;
  'Last Name'?: string;
  Company?: string;
  Role?: string;
  'Created Date'?: string;
}

interface BubbleSection {
  _id: string;
  Name?: string;
  Order?: number;
  Help?: string;
  'Created Date'?: string;
}

interface BubbleSubsection {
  _id: string;
  Name?: string;
  Order?: number;
  'Parent Section'?: string;
  'Created Date'?: string;
}

interface BubbleTag {
  _id: string;
  Name?: string;
  Description?: string;
  'Created Date'?: string;
}

interface BubbleQuestion {
  _id: string;
  Name?: string;
  Content?: string;
  'Question Description'?: string;
  Type?: string;
  Order?: number;
  Required?: boolean;
  'SECTION SORT NUMBER'?: number;
  'SUBSECTION SORT NUMBER'?: number;
  'Parent Section'?: string;
  'Parent Subsection'?: string;
  Tags?: string[];
  'List Table'?: string;
  'Created Date'?: string;
}

interface BubbleChoice {
  _id: string;
  'Choice Text'?: string;
  Content?: string;
  Order?: number;
  'Parent Question'?: string;
  'Created Date'?: string;
}

interface BubbleListTableColumn {
  _id: string;
  Name?: string;
  Order?: number;
  'Response Type'?: string;
  'Choice Options'?: string[];
  'Parent Table'?: string;
  'Parent Question'?: string;
  'Created Date'?: string;
}

interface BubbleSheet {
  _id: string;
  Name?: string;
  Company?: string;  // supplier
  'Sup Assigned to'?: string;  // also supplier reference
  'Original Requestor assoc'?: string;  // requesting company
  'New Status'?: string;
  Version?: number;
  'Version Father Sheet'?: string;
  tags?: string[];
  'Created Date'?: string;
  'Modified Date'?: string;
  'Created By'?: string;
}

interface BubbleAnswer {
  _id: string;
  Sheet?: string;
  'Parent Question'?: string;
  text?: string;
  'text-area'?: string;
  Number?: number;
  Boolean?: boolean;
  Date?: string;
  Choice?: string;
  'List Table Column'?: string;
  'List Table Row'?: string;
  Company?: string;
  'Created Date'?: string;
  'Modified Date'?: string;
  'Created By'?: string;
}

// ============================================================================
// Import Functions
// ============================================================================

async function importCompanies(): Promise<number> {
  console.log('\n[1/9] Importing companies...');
  const count = await countBubble('company');
  console.log(`  Found ${count} companies`);

  let imported = 0;
  const records: Array<{ id: string; name: string; created_at: string | null }> = [];

  for await (const c of fetchAll<BubbleCompany>('company')) {
    const id = randomUUID();
    recordId(c._id, id, 'company');
    records.push({
      id,
      name: c['Company Name'] || 'Unknown Company',
      created_at: c['Created Date'] || null
    });
    imported++;
    if (imported % 100 === 0) console.log(`  Processed ${imported}/${count}`);
  }

  if (!DRY_RUN && records.length > 0) {
    const { error } = await supabase.from('companies').insert(records);
    if (error) throw new Error(`Failed to insert companies: ${error.message}`);
  }

  console.log(`  Imported ${imported} companies`);
  return imported;
}

async function importUsers(): Promise<number> {
  console.log('\n[2/9] Importing users...');
  const count = await countBubble('user');
  console.log(`  Found ${count} users`);

  let imported = 0;
  const records: Array<{
    id: string;
    email: string;
    full_name: string | null;
    company_id: string | null;
    role: string;
    created_at: string | null;
  }> = [];

  for await (const u of fetchAll<BubbleUser>('user')) {
    const id = randomUUID();
    recordId(u._id, id, 'user');

    const fullName = u['Full Name'] ||
      [u['First Name'], u['Last Name']].filter(Boolean).join(' ') ||
      null;

    records.push({
      id,
      email: u.email || `unknown-${u._id}@stacks.local`,
      full_name: fullName,
      company_id: getId(u.Company, 'company'),
      role: u.Role || 'user',
      created_at: u['Created Date'] || null
    });
    imported++;
    if (imported % 100 === 0) console.log(`  Processed ${imported}/${count}`);
  }

  if (!DRY_RUN && records.length > 0) {
    const { error } = await supabase.from('users').insert(records);
    if (error) throw new Error(`Failed to insert users: ${error.message}`);
  }

  console.log(`  Imported ${imported} users`);
  return imported;
}

async function importSections(): Promise<number> {
  console.log('\n[3/9] Importing sections...');
  const count = await countBubble('section');
  console.log(`  Found ${count} sections`);

  let imported = 0;
  const records: Array<{
    id: string;
    name: string;
    order_number: number | null;
    help_text: string | null;
    created_at: string | null;
  }> = [];

  for await (const s of fetchAll<BubbleSection>('section')) {
    const id = randomUUID();
    recordId(s._id, id, 'section');
    records.push({
      id,
      name: s.Name || 'Unknown Section',
      order_number: s.Order != null ? Math.round(s.Order) : null,
      help_text: s.Help || null,
      created_at: s['Created Date'] || null
    });
    imported++;
  }

  if (!DRY_RUN && records.length > 0) {
    const { error } = await supabase.from('sections').insert(records);
    if (error) throw new Error(`Failed to insert sections: ${error.message}`);
  }

  console.log(`  Imported ${imported} sections`);
  return imported;
}

async function importSubsections(): Promise<number> {
  console.log('\n[4/9] Importing subsections...');
  const count = await countBubble('subsection');
  console.log(`  Found ${count} subsections`);

  let imported = 0;
  const records: Array<{
    id: string;
    section_id: string | null;
    name: string;
    order_number: number | null;
    created_at: string | null;
  }> = [];

  for await (const s of fetchAll<BubbleSubsection>('subsection')) {
    const id = randomUUID();
    recordId(s._id, id, 'subsection');
    records.push({
      id,
      section_id: getId(s['Parent Section'], 'section'),
      name: s.Name || 'Unknown Subsection',
      order_number: s.Order != null ? Math.round(s.Order) : null,
      created_at: s['Created Date'] || null
    });
    imported++;
  }

  if (!DRY_RUN && records.length > 0) {
    const { error } = await supabase.from('subsections').insert(records);
    if (error) throw new Error(`Failed to insert subsections: ${error.message}`);
  }

  console.log(`  Imported ${imported} subsections`);
  return imported;
}

async function importTags(): Promise<number> {
  console.log('\n[5/9] Importing tags...');
  const count = await countBubble('tag');
  console.log(`  Found ${count} tags`);

  let imported = 0;
  const records: Array<{
    id: string;
    name: string;
    description: string | null;
    created_at: string | null;
  }> = [];

  for await (const t of fetchAll<BubbleTag>('tag')) {
    // Skip tags without names (test/garbage data)
    if (!t.Name) {
      console.log(`  Skipping tag without name: ${t._id}`);
      continue;
    }
    const id = randomUUID();
    recordId(t._id, id, 'tag');
    records.push({
      id,
      name: t.Name,
      description: t.Description || null,
      created_at: t['Created Date'] || null
    });
    imported++;
  }

  if (!DRY_RUN && records.length > 0) {
    const { error } = await supabase.from('tags').insert(records);
    if (error) throw new Error(`Failed to insert tags: ${error.message}`);
  }

  console.log(`  Imported ${imported} tags`);
  return imported;
}

async function importQuestions(): Promise<number> {
  console.log('\n[6/9] Importing questions and question_tags...');
  const count = await countBubble('question');
  console.log(`  Found ${count} questions`);

  let imported = 0;
  const questionRecords: Array<{
    id: string;
    subsection_id: string | null;
    name: string;
    content: string | null;
    description: string | null;
    response_type: string;
    order_number: number | null;
    required: boolean;
    section_sort_number: number | null;
    subsection_sort_number: number | null;
    created_at: string | null;
  }> = [];
  const questionTagRecords: Array<{
    id: string;
    question_id: string;
    tag_id: string;
  }> = [];

  for await (const q of fetchAll<BubbleQuestion>('question')) {
    const id = randomUUID();
    recordId(q._id, id, 'question');

    questionRecords.push({
      id,
      subsection_id: getId(q['Parent Subsection'], 'subsection'),
      name: q.Name || '',
      content: q.Content || null,
      description: q['Question Description'] || null,
      response_type: q.Type || 'text',
      order_number: q.Order != null ? Math.round(q.Order) : null,
      required: q.Required ?? false,
      section_sort_number: q['SECTION SORT NUMBER'] != null ? Math.round(q['SECTION SORT NUMBER']) : null,
      subsection_sort_number: q['SUBSECTION SORT NUMBER'] != null ? Math.round(q['SUBSECTION SORT NUMBER']) : null,
      created_at: q['Created Date'] || null
    });

    // Record question-tag relationships
    if (q.Tags) {
      for (const tagBubbleId of q.Tags) {
        const tagId = getId(tagBubbleId, 'tag');
        if (tagId) {
          questionTagRecords.push({
            id: randomUUID(),
            question_id: id,
            tag_id: tagId
          });
        }
      }
    }

    imported++;
    if (imported % 100 === 0) console.log(`  Processed ${imported}/${count}`);
  }

  if (!DRY_RUN) {
    if (questionRecords.length > 0) {
      const { error } = await supabase.from('questions').insert(questionRecords);
      if (error) throw new Error(`Failed to insert questions: ${error.message}`);
    }
    if (questionTagRecords.length > 0) {
      const { error } = await supabase.from('question_tags').insert(questionTagRecords);
      if (error) throw new Error(`Failed to insert question_tags: ${error.message}`);
    }
  }

  console.log(`  Imported ${imported} questions, ${questionTagRecords.length} question_tags`);
  return imported;
}

async function importChoices(): Promise<number> {
  console.log('\n[7/9] Importing choices...');
  const count = await countBubble('choice');
  console.log(`  Found ${count} choices`);

  let imported = 0;
  const records: Array<{
    id: string;
    question_id: string | null;
    content: string;
    order_number: number | null;
    created_at: string | null;
  }> = [];

  for await (const c of fetchAll<BubbleChoice>('choice')) {
    const id = randomUUID();
    recordId(c._id, id, 'choice');
    records.push({
      id,
      question_id: getId(c['Parent Question'], 'question'),
      content: c.Content || c['Choice Text'] || '',
      order_number: c.Order != null ? Math.round(c.Order) : null,
      created_at: c['Created Date'] || null
    });
    imported++;
    if (imported % 100 === 0) console.log(`  Processed ${imported}/${count}`);
  }

  if (!DRY_RUN && records.length > 0) {
    // Batch insert in chunks
    for (let i = 0; i < records.length; i += 500) {
      const batch = records.slice(i, i + 500);
      const { error } = await supabase.from('choices').insert(batch);
      if (error) throw new Error(`Failed to insert choices: ${error.message}`);
    }
  }

  console.log(`  Imported ${imported} choices`);
  return imported;
}

async function importListTableColumns(): Promise<number> {
  console.log('\n[8a/9] Importing list_table_columns...');

  // Fetch columns - they reference questions directly or via parent_table
  const count = await countBubble('listtablecolumn');
  console.log(`  Found ${count} list table columns`);

  let imported = 0;
  const records: Array<{
    id: string;
    question_id: string | null;
    name: string;
    order_number: number | null;
    response_type: string | null;
    choice_options: string[] | null;
    created_at: string | null;
  }> = [];

  for await (const c of fetchAll<BubbleListTableColumn>('listtablecolumn')) {
    const id = randomUUID();
    recordId(c._id, id, 'list_table_column');

    records.push({
      id,
      question_id: getId(c['Parent Question'], 'question'),
      name: c.Name || '',
      order_number: c.Order != null ? Math.round(c.Order) : null,
      response_type: c['Response Type'] || null,
      choice_options: c['Choice Options'] || null,
      created_at: c['Created Date'] || null
    });
    imported++;
    if (imported % 100 === 0) console.log(`  Processed ${imported}/${count}`);
  }

  if (!DRY_RUN && records.length > 0) {
    for (let i = 0; i < records.length; i += 500) {
      const batch = records.slice(i, i + 500);
      const { error } = await supabase.from('list_table_columns').insert(batch);
      if (error) throw new Error(`Failed to insert list_table_columns: ${error.message}`);
    }
  }

  console.log(`  Imported ${imported} list_table_columns`);
  return imported;
}

async function importSheetsAndAnswers(): Promise<{ sheets: number; answers: number }> {
  console.log('\n[8/9] Loading all sheets to group by product/supplier...');

  // Step 1: Load ALL sheets into memory
  interface SheetMeta {
    bubbleId: string;
    name: string;
    nameLower: string;
    supplierId: string | null;
    version: number;
    createdAt: string | null;
    raw: BubbleSheet;
  }

  const allSheets: SheetMeta[] = [];
  const sheetCount = await countBubble('sheet');
  console.log(`  Found ${sheetCount} total sheets`);

  let loaded = 0;
  for await (const s of fetchAll<BubbleSheet>('sheet')) {
    allSheets.push({
      bubbleId: s._id,
      name: s.Name || 'Unknown',
      nameLower: (s.Name || 'Unknown').toLowerCase().trim(),
      supplierId: s.Company || s['Sup Assigned to'] || null,
      version: s.Version || 1,
      createdAt: s['Created Date'] || null,
      raw: s
    });
    loaded++;
    if (loaded % 500 === 0) console.log(`  Loaded ${loaded}/${sheetCount}`);
  }

  // Step 2: Group ALL versions by product name + supplier
  console.log('  Grouping sheets by product/supplier...');
  const sheetGroups = new Map<string, SheetMeta[]>(); // key: nameLower|supplierId -> all versions

  for (const sheet of allSheets) {
    const key = `${sheet.nameLower}|${sheet.supplierId || 'null'}`;
    if (!sheetGroups.has(key)) {
      sheetGroups.set(key, []);
    }
    sheetGroups.get(key)!.push(sheet);
  }

  console.log(`  Found ${sheetGroups.size} unique product/supplier combinations (from ${allSheets.length} total sheets)`);

  // Step 3: Create ONE sheet per group, using latest version's metadata
  // Merge tags from ALL versions
  console.log('\n[9/9] Creating composite sheets...');
  const sheetRecords: Array<{
    id: string;
    name: string;
    company_id: string | null;
    requesting_company_id: string | null;
    version: number;
    status: string;
    created_by: string | null;
    created_at: string | null;
    modified_at: string | null;
  }> = [];
  const sheetTagRecords: Array<{
    id: string;
    sheet_id: string;
    tag_id: string;
  }> = [];

  // Map: groupKey -> { newSheetId, allBubbleIds[] }
  const groupToSheet = new Map<string, { newSheetId: string; bubbleIds: string[] }>();

  for (const [key, versions] of sheetGroups) {
    // Sort by version descending to get latest first
    versions.sort((a, b) => b.version - a.version);
    const latest = versions[0];

    const newSheetId = randomUUID();

    // Record ALL bubble IDs for this group (for answer lookup)
    const bubbleIds = versions.map(v => v.bubbleId);
    groupToSheet.set(key, { newSheetId, bubbleIds });

    // Map latest bubble ID to new sheet ID (for any direct lookups)
    recordId(latest.bubbleId, newSheetId, 'sheet');

    const s = latest.raw;
    sheetRecords.push({
      id: newSheetId,
      name: s.Name || 'Unknown',
      company_id: getId(s.Company || s['Sup Assigned to'], 'company'),
      requesting_company_id: getId(s['Original Requestor assoc'], 'company'),
      version: latest.version, // Store the highest version number
      status: s['New Status'] || 'draft',
      created_by: getId(s['Created By'], 'user'),
      created_at: s['Created Date'] || null,
      modified_at: s['Modified Date'] || null
    });

    // Merge tags from ALL versions (deduplicated)
    const allTags = new Set<string>();
    for (const v of versions) {
      if (v.raw.tags) {
        for (const tagBubbleId of v.raw.tags) {
          const tagId = getId(tagBubbleId, 'tag');
          if (tagId) allTags.add(tagId);
        }
      }
    }

    for (const tagId of allTags) {
      sheetTagRecords.push({
        id: randomUUID(),
        sheet_id: newSheetId,
        tag_id: tagId
      });
    }
  }

  // Build reverse lookup: bubbleSheetId -> newSheetId
  const bubbleToNewSheet = new Map<string, string>();
  for (const [, { newSheetId, bubbleIds }] of groupToSheet) {
    for (const bubbleId of bubbleIds) {
      bubbleToNewSheet.set(bubbleId, newSheetId);
    }
  }

  if (!DRY_RUN) {
    if (sheetRecords.length > 0) {
      for (let i = 0; i < sheetRecords.length; i += 500) {
        const batch = sheetRecords.slice(i, i + 500);
        const { error } = await supabase.from('sheets').insert(batch);
        if (error) throw new Error(`Failed to insert sheets: ${error.message}`);
      }
    }
    if (sheetTagRecords.length > 0) {
      for (let i = 0; i < sheetTagRecords.length; i += 500) {
        const batch = sheetTagRecords.slice(i, i + 500);
        const { error } = await supabase.from('sheet_tags').insert(batch);
        if (error) throw new Error(`Failed to insert sheet_tags: ${error.message}`);
      }
    }
  }

  console.log(`  Imported ${sheetRecords.length} sheets, ${sheetTagRecords.length} sheet_tags`);

  // Step 4: Import answers - FOR EACH QUESTION, take MOST RECENT answer across all versions
  console.log('\n[9b/9] Loading all answers to find most recent per question...');
  const answerCount = await countBubble('answer');
  console.log(`  Found ${answerCount} total answers`);

  // Load all answers into memory, grouped by (newSheetId, questionId, listTableRowId, listTableColumnId)
  // For each group, keep only the most recent by Modified Date
  interface AnswerCandidate {
    bubbleId: string;
    newSheetId: string;
    questionId: string;
    modifiedAt: Date;
    raw: BubbleAnswer;
  }

  // Key: newSheetId|questionId|listTableRowId|listTableColumnId
  const latestAnswers = new Map<string, AnswerCandidate>();

  let answersLoaded = 0;
  let skipped = 0;
  for await (const a of fetchAll<BubbleAnswer>('answer')) {
    answersLoaded++;
    if (answersLoaded % 50000 === 0) console.log(`  Processed ${answersLoaded}/${answerCount} answers...`);

    // Find the composite sheet this answer belongs to
    if (!a.Sheet) {
      skipped++;
      continue;
    }

    const newSheetId = bubbleToNewSheet.get(a.Sheet);
    if (!newSheetId) {
      skipped++;
      continue;
    }

    const questionId = getId(a['Parent Question'], 'question');
    if (!questionId) {
      skipped++;
      continue;
    }

    // Build unique key for this answer "slot"
    // For list table answers, include row and column; for regular answers, these are null
    const listTableRowId = a['List Table Row'] || '';
    const listTableColumnId = a['List Table Column'] || '';
    const key = `${newSheetId}|${questionId}|${listTableRowId}|${listTableColumnId}`;

    const modifiedAt = new Date(a['Modified Date'] || a['Created Date'] || '1970-01-01');

    const existing = latestAnswers.get(key);
    if (!existing || modifiedAt > existing.modifiedAt) {
      latestAnswers.set(key, {
        bubbleId: a._id,
        newSheetId,
        questionId,
        modifiedAt,
        raw: a
      });
    }
  }

  console.log(`  Filtered to ${latestAnswers.size} most-recent answers (from ${answersLoaded} total, skipped ${skipped})`);

  // Now insert the latest answers
  console.log('  Inserting latest answers...');
  let answersImported = 0;
  let answerBatch: Array<{
    id: string;
    sheet_id: string;
    question_id: string;
    text_value: string | null;
    number_value: number | null;
    boolean_value: boolean | null;
    date_value: string | null;
    choice_id: string | null;
    list_table_row_id: string | null;
    list_table_column_id: string | null;
    company_id: string | null;
    created_by: string | null;
    created_at: string | null;
    modified_at: string | null;
  }> = [];

  for (const [, candidate] of latestAnswers) {
    const a = candidate.raw;
    const id = randomUUID();
    recordId(a._id, id, 'answer');

    answerBatch.push({
      id,
      sheet_id: candidate.newSheetId,
      question_id: candidate.questionId,
      text_value: a.text || a['text-area'] || null,
      number_value: a.Number ?? null,
      boolean_value: a.Boolean ?? null,
      date_value: a.Date || null,
      choice_id: getId(a.Choice, 'choice'),
      list_table_row_id: a['List Table Row'] || null,
      list_table_column_id: getId(a['List Table Column'], 'list_table_column'),
      company_id: getId(a.Company, 'company'),
      created_by: getId(a['Created By'], 'user'),
      created_at: a['Created Date'] || null,
      modified_at: a['Modified Date'] || null
    });

    // Batch insert every 1000 records
    if (answerBatch.length >= 1000) {
      if (!DRY_RUN) {
        const { error } = await supabase.from('answers').insert(answerBatch);
        if (error) {
          console.error(`  Error inserting answer batch: ${error.message}`);
          // Try one by one for debugging
          let batchSuccess = 0;
          for (const answer of answerBatch) {
            const { error: singleError } = await supabase.from('answers').insert(answer);
            if (!singleError) batchSuccess++;
          }
          answersImported += batchSuccess;
        } else {
          answersImported += answerBatch.length;
        }
      } else {
        answersImported += answerBatch.length;
      }
      answerBatch = [];
      console.log(`  Imported ${answersImported}/${latestAnswers.size} answers`);
    }
  }

  // Insert remaining batch
  if (answerBatch.length > 0 && !DRY_RUN) {
    const { error } = await supabase.from('answers').insert(answerBatch);
    if (error) {
      console.error(`  Error inserting final answer batch: ${error.message}`);
      let batchSuccess = 0;
      for (const answer of answerBatch) {
        const { error: singleError } = await supabase.from('answers').insert(answer);
        if (!singleError) batchSuccess++;
      }
      answersImported += batchSuccess;
    } else {
      answersImported += answerBatch.length;
    }
  } else if (answerBatch.length > 0) {
    answersImported += answerBatch.length;
  }

  console.log(`  Imported ${answersImported} answers (most recent per question across all versions)`);

  return { sheets: sheetRecords.length, answers: answersImported };
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  console.log('===============================================');
  console.log('   Fresh Import: Bubble -> Supabase');
  console.log('===============================================');
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`BATCH_SIZE: ${BATCH_SIZE}`);
  console.log();

  initIdMap();

  const startTime = Date.now();

  try {
    // Import in dependency order
    await importCompanies();
    await importUsers();
    await importSections();
    await importSubsections();
    await importTags();
    await importQuestions();
    await importChoices();
    await importListTableColumns();
    const { sheets, answers } = await importSheetsAndAnswers();

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n===============================================');
    console.log('   Import Complete!');
    console.log('===============================================');
    console.log(`Total time: ${elapsed} minutes`);
    console.log(`Sheets: ${sheets} (latest versions only)`);
    console.log(`Answers: ${answers}`);

    if (DRY_RUN) {
      console.log('\n[DRY RUN] No data was written to Supabase');
    }
  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  }
}

main();

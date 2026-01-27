/**
 * Export Bubble Data to JSON files and then Import to Supabase
 *
 * This script:
 * 1. Fetches all data from Bubble API and saves to JSON files
 * 2. Imports that data into Supabase with composite sheet logic
 *
 * Run: npx tsx fresh-import/export-and-import.ts
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EXPORT_DIR = path.join(__dirname, 'bubble-export');

// Rate limiting
const REQUESTS_PER_MINUTE = 100;
const REQUEST_INTERVAL = 60000 / REQUESTS_PER_MINUTE;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string, options: any): Promise<any> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  return fetch(url, options);
}

async function fetchBubbleWithRetry(endpoint: string, cursor: number, retries = 5): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `${BUBBLE_API_URL}/api/1.1/obj/${endpoint}?limit=100&cursor=${cursor}`;
      const response = await rateLimitedFetch(url, {
        headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` }
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 500 || response.status === 429) {
          const waitTime = attempt * 30;
          console.log(`  Bubble API error ${response.status}, attempt ${attempt}/${retries}, waiting ${waitTime}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          continue;
        }
        throw new Error(`Bubble API error: ${response.status} ${text.substring(0, 200)}`);
      }

      return await response.json();
    } catch (error: any) {
      if (attempt === retries) throw error;
      const waitTime = attempt * 30;
      console.log(`  Network error, attempt ${attempt}/${retries}, waiting ${waitTime}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }
}

async function exportTable(tableName: string): Promise<any[]> {
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`);

  // Check if already exported
  if (fs.existsSync(filePath)) {
    console.log(`  Loading ${tableName} from cache...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`  Loaded ${data.length} records from cache`);
    return data;
  }

  console.log(`  Fetching ${tableName} from Bubble...`);
  const allResults: any[] = [];
  let cursor = 0;

  while (true) {
    const data = await fetchBubbleWithRetry(tableName, cursor);
    const results = data.response?.results || [];

    if (results.length === 0) break;

    allResults.push(...results);

    if (!data.response?.remaining || data.response.remaining === 0) break;

    cursor += results.length;

    if (allResults.length % 1000 === 0) {
      console.log(`    ${allResults.length} records so far...`);
    }
  }

  // Save to file
  fs.writeFileSync(filePath, JSON.stringify(allResults, null, 2));
  console.log(`  Exported ${allResults.length} ${tableName} records`);

  return allResults;
}

// Special function to export answers in chunks (Bubble has 50k cursor limit)
async function exportAnswersInChunks(sheets: any[]): Promise<any[]> {
  const filePath = path.join(EXPORT_DIR, 'answer.json');

  // Check if already exported AND has more than 50k records
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (data.length > 50000) {
      console.log(`  Loading answers from cache (${data.length} records)...`);
      return data;
    }
    console.log(`  Cache has only ${data.length} answers, re-exporting in chunks...`);
  }

  console.log(`  Fetching answers in chunks by sheet ID (${sheets.length} sheets)...`);
  const allAnswers: any[] = [];
  const seenAnswerIds = new Set<string>();

  // Group sheets into batches for progress reporting
  let processedSheets = 0;

  for (const sheet of sheets) {
    const sheetId = sheet._id;
    let cursor = 0;

    while (true) {
      // Use constraint to filter by sheet
      const constraint = encodeURIComponent(JSON.stringify([{ key: 'Sheet', constraint_type: 'equals', value: sheetId }]));
      const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?limit=100&cursor=${cursor}&constraints=${constraint}`;

      try {
        const response = await rateLimitedFetch(url, {
          headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log(`    Rate limited, waiting 30s...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
            continue;
          }
          break; // Skip this sheet on other errors
        }

        const data = await response.json();
        const results = data.response?.results || [];

        if (results.length === 0) break;

        // Add only unseen answers (dedup by ID)
        for (const answer of results) {
          if (!seenAnswerIds.has(answer._id)) {
            seenAnswerIds.add(answer._id);
            allAnswers.push(answer);
          }
        }

        if (!data.response?.remaining || data.response.remaining === 0) break;
        cursor += results.length;
      } catch (error) {
        console.log(`    Error fetching sheet ${sheetId}, skipping...`);
        break;
      }
    }

    processedSheets++;
    if (processedSheets % 100 === 0) {
      console.log(`    Processed ${processedSheets}/${sheets.length} sheets, ${allAnswers.length} answers so far...`);
    }
  }

  // Save to file
  fs.writeFileSync(filePath, JSON.stringify(allAnswers, null, 2));
  console.log(`  Exported ${allAnswers.length} answers from ${sheets.length} sheets`);

  return allAnswers;
}

async function main() {
  console.log('===============================================');
  console.log('   Fresh Import: Export Bubble -> Import Supabase');
  console.log('===============================================\n');

  // Create export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  // ============================================================
  // PHASE 1: Export all data from Bubble
  // ============================================================
  console.log('\n=== PHASE 1: Export from Bubble ===\n');

  const companies = await exportTable('company');
  const users = await exportTable('user');
  const sections = await exportTable('section');
  const subsections = await exportTable('subsection');
  const tags = await exportTable('tag');
  const questions = await exportTable('question');
  const choices = await exportTable('choice');
  const listTableColumns = await exportTable('listtablecolumn');
  const sheets = await exportTable('sheet');

  console.log('\nNow exporting answers (this is the big one)...');
  const answers = await exportAnswersInChunks(sheets);

  console.log('\nExport complete!');
  console.log(`  Companies: ${companies.length}`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Sections: ${sections.length}`);
  console.log(`  Subsections: ${subsections.length}`);
  console.log(`  Tags: ${tags.length}`);
  console.log(`  Questions: ${questions.length}`);
  console.log(`  Choices: ${choices.length}`);
  console.log(`  List Table Columns: ${listTableColumns.length}`);
  console.log(`  Sheets: ${sheets.length}`);
  console.log(`  Answers: ${answers.length}`);

  // ============================================================
  // PHASE 2: Import into Supabase
  // ============================================================
  console.log('\n=== PHASE 2: Import to Supabase ===\n');

  // Build ID mappings
  const bubbleToSupabase = {
    company: new Map<string, string>(),
    user: new Map<string, string>(),
    section: new Map<string, string>(),
    subsection: new Map<string, string>(),
    tag: new Map<string, string>(),
    question: new Map<string, string>(),
    choice: new Map<string, string>(),
    listTableColumn: new Map<string, string>(),
    sheet: new Map<string, string>()
  };

  // 1. Import Companies
  console.log('[1/10] Importing companies...');
  for (const c of companies) {
    const id = randomUUID();
    bubbleToSupabase.company.set(c._id, id);

    const { error } = await supabase.from('companies').upsert({
      id,
      name: c.Name || 'Unknown',
      location: c['location text'] || null,
      type: c['Show as supplier'] ? 'supplier' : 'customer',
      bubble_id: c._id,
      created_at: c['Created Date'],
      modified_at: c['Modified Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  Company error: ${error.message}`);
  }
  console.log(`  Imported ${companies.length} companies`);

  // 2. Import Users
  console.log('[2/10] Importing users...');
  for (const u of users) {
    const id = randomUUID();
    bubbleToSupabase.user.set(u._id, id);

    const companyId = u.Company ? bubbleToSupabase.company.get(u.Company) : null;

    const { error } = await supabase.from('users').upsert({
      id,
      email: u.email || `user-${u._id}@placeholder.com`,
      full_name: u['First Name'] && u['Last Name']
        ? `${u['First Name']} ${u['Last Name']}`.trim()
        : u.email?.split('@')[0] || 'Unknown',
      company_id: companyId,
      role: u.Admin ? 'admin' : 'user',
      bubble_id: u._id,
      created_at: u['Created Date'],
      modified_at: u['Modified Date']
    }, { onConflict: 'bubble_id' });

    if (error && !error.message.includes('duplicate')) {
      console.error(`  User error: ${error.message}`);
    }
  }
  console.log(`  Imported ${users.length} users`);

  // 3. Import Sections
  console.log('[3/10] Importing sections...');
  for (const s of sections) {
    const id = randomUUID();
    bubbleToSupabase.section.set(s._id, id);

    const { error } = await supabase.from('sections').upsert({
      id,
      name: s.Name || 'Unnamed Section',
      order_number: Math.round(s.Order || 1),
      help_text: s.Help || null,
      bubble_id: s._id,
      created_at: s['Created Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  Section error: ${error.message}`);
  }
  console.log(`  Imported ${sections.length} sections`);

  // 4. Import Subsections
  console.log('[4/10] Importing subsections...');
  for (const ss of subsections) {
    const id = randomUUID();
    bubbleToSupabase.subsection.set(ss._id, id);

    const parentSectionId = ss.Parent_Section
      ? bubbleToSupabase.section.get(ss.Parent_Section)
      : null;

    const { error } = await supabase.from('subsections').upsert({
      id,
      name: ss.Name || 'Unnamed Subsection',
      order_number: Math.round(ss.Order || 1),
      section_id: parentSectionId,
      bubble_id: ss._id,
      created_at: ss['Created Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  Subsection error: ${error.message}`);
  }
  console.log(`  Imported ${subsections.length} subsections`);

  // 5. Import Tags
  console.log('[5/10] Importing tags...');
  for (const t of tags) {
    if (!t.Name) continue; // Skip unnamed tags

    const id = randomUUID();
    bubbleToSupabase.tag.set(t._id, id);

    const { error } = await supabase.from('tags').upsert({
      id,
      name: t.Name,
      description: t.Description || null,
      bubble_id: t._id,
      created_at: t['Created Date']
    }, { onConflict: 'bubble_id' });

    if (error && !error.message.includes('duplicate')) {
      console.error(`  Tag error: ${error.message}`);
    }
  }
  console.log(`  Imported ${bubbleToSupabase.tag.size} tags`);

  // 6. Import Questions
  console.log('[6/10] Importing questions...');
  for (const q of questions) {
    const id = randomUUID();
    bubbleToSupabase.question.set(q._id, id);

    const subsectionId = q['Parent Subsection']
      ? bubbleToSupabase.subsection.get(q['Parent Subsection'])
      : null;

    const { error } = await supabase.from('questions').upsert({
      id,
      name: q.Name || 'Unnamed Question',
      content: q.Name || '',
      response_type: q.Type || 'Single text line',
      order_number: Math.round(q.Order || q.ID || 1),
      section_sort_number: q['SECTION SORT NUMBER'] || null,
      subsection_sort_number: q['SUBSECTION SORT NUMBER'] || null,
      subsection_id: subsectionId,
      bubble_id: q._id,
      created_at: q['Created Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  Question error: ${error.message}`);
  }
  console.log(`  Imported ${questions.length} questions`);

  // 6b. Import Question-Tag relationships
  console.log('  Importing question-tag relationships...');
  let questionTagCount = 0;
  for (const q of questions) {
    if (!q.Tags || !Array.isArray(q.Tags)) continue;

    const questionId = bubbleToSupabase.question.get(q._id);
    if (!questionId) continue;

    for (const tagBubbleId of q.Tags) {
      const tagId = bubbleToSupabase.tag.get(tagBubbleId);
      if (!tagId) continue;

      const { error } = await supabase.from('question_tags').upsert({
        question_id: questionId,
        tag_id: tagId
      }, { onConflict: 'question_id,tag_id', ignoreDuplicates: true });

      if (!error) questionTagCount++;
    }
  }
  console.log(`  Imported ${questionTagCount} question-tag relationships`);

  // 7. Import Choices
  console.log('[7/10] Importing choices...');
  for (const c of choices) {
    const id = randomUUID();
    bubbleToSupabase.choice.set(c._id, id);

    const questionId = c['Parent Question']
      ? bubbleToSupabase.question.get(c['Parent Question'])
      : null;

    const { error } = await supabase.from('choices').upsert({
      id,
      content: c.Content || c['Choice Text'] || 'Unknown',
      order_number: Math.round(c.Order || 1),
      question_id: questionId,
      bubble_id: c._id,
      created_at: c['Created Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  Choice error: ${error.message}`);
  }
  console.log(`  Imported ${choices.length} choices`);

  // 8. Import List Table Columns
  console.log('[8/10] Importing list table columns...');
  for (const ltc of listTableColumns) {
    const id = randomUUID();
    bubbleToSupabase.listTableColumn.set(ltc._id, id);

    const { error } = await supabase.from('list_table_columns').upsert({
      id,
      name: ltc.Name || 'Unnamed Column',
      order_number: Math.round(ltc.Order || 1),
      response_type: ltc['Input Type'] || 'text',
      choice_options: ltc['Choice Options'] || null,
      bubble_id: ltc._id,
      created_at: ltc['Created Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  List table column error: ${error.message}`);
  }
  console.log(`  Imported ${listTableColumns.length} list table columns`);

  // 9. Import Sheets with Composite Logic
  console.log('[9/10] Importing sheets with composite logic...');

  // Group sheets by product name + supplier company
  interface SheetGroup {
    name: string;
    companyBubbleId: string;
    versions: any[];
  }

  const sheetGroups = new Map<string, SheetGroup>();

  for (const s of sheets) {
    const name = s.Name || 'Unknown Product';
    const companyId = s.Company || s['Sup Assigned to'] || '';
    const key = `${name.toLowerCase()}|${companyId}`;

    if (!sheetGroups.has(key)) {
      sheetGroups.set(key, {
        name,
        companyBubbleId: companyId,
        versions: []
      });
    }
    sheetGroups.get(key)!.versions.push(s);
  }

  console.log(`  Found ${sheetGroups.size} unique product/supplier combinations`);

  // Create one sheet per group
  const bubbleSheetToCompositeSheet = new Map<string, string>();
  const latestBubbleSheetForComposite = new Map<string, string>(); // compositeId -> latest bubble sheet ID

  for (const [, group] of sheetGroups) {
    // Sort versions by Modified Date descending
    group.versions.sort((a, b) =>
      new Date(b['Modified Date'] || 0).getTime() - new Date(a['Modified Date'] || 0).getTime()
    );

    const latest = group.versions[0];
    const id = randomUUID();

    // Track the latest version's bubble ID for list table deduplication
    latestBubbleSheetForComposite.set(id, latest._id);

    // Map ALL bubble sheet IDs to this composite sheet
    for (const v of group.versions) {
      bubbleSheetToCompositeSheet.set(v._id, id);
      bubbleToSupabase.sheet.set(v._id, id);
    }

    const companyId = bubbleToSupabase.company.get(group.companyBubbleId) || null;
    const createdById = latest['Created By']
      ? bubbleToSupabase.user.get(latest['Created By'])
      : null;

    const { error } = await supabase.from('sheets').upsert({
      id,
      name: group.name,
      version: group.versions.length,
      company_id: companyId,
      created_by: createdById,
      status: latest.Status || 'draft',
      bubble_id: latest._id, // Use latest version's bubble_id
      created_at: latest['Created Date'],
      modified_at: latest['Modified Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  Sheet error: ${error.message}`);

    // Merge tags from ALL versions
    const allTags = new Set<string>();
    for (const v of group.versions) {
      if (v.Tags && Array.isArray(v.Tags)) {
        for (const t of v.Tags) {
          const tagId = bubbleToSupabase.tag.get(t);
          if (tagId) allTags.add(tagId);
        }
      }
    }

    // Insert sheet-tag relationships
    for (const tagId of allTags) {
      await supabase.from('sheet_tags').upsert({
        sheet_id: id,
        tag_id: tagId
      }, { onConflict: 'sheet_id,tag_id', ignoreDuplicates: true });
    }
  }

  console.log(`  Created ${sheetGroups.size} composite sheets`);

  // 10. Import Answers with Version-Based Deduplication
  console.log('[10/10] Importing answers with version-based deduplication...');

  interface AnswerCandidate {
    compositeSheetId: string;
    questionId: string;
    listTableRowId: string;
    listTableColumnId: string;
    modifiedAt: Date;
    raw: any;
  }

  // For list table answers: Only keep answers from the LATEST sheet version
  // (by sheet Modified Date), not by individual answer timestamps.
  // This ensures we get the complete list table from the most recent version,
  // not a mix of rows from different versions.
  //
  // For non-list-table answers: Keep the most recent answer per question
  // across all versions (existing logic).

  console.log('  Filtering answers by sheet version...');
  const latestAnswers = new Map<string, AnswerCandidate>();
  let answersProcessed = 0;
  let answersSkipped = 0;
  let listTableKept = 0;
  let listTableFiltered = 0;

  for (const a of answers) {
    answersProcessed++;

    if (answersProcessed % 50000 === 0) {
      console.log(`    Processed ${answersProcessed}/${answers.length} answers...`);
    }

    // Skip if no sheet
    if (!a.Sheet) {
      answersSkipped++;
      continue;
    }

    // Get composite sheet ID
    const compositeSheetId = bubbleSheetToCompositeSheet.get(a.Sheet);
    if (!compositeSheetId) {
      answersSkipped++;
      continue;
    }

    // Get question ID
    const questionId = bubbleToSupabase.question.get(a['Parent Question']);
    if (!questionId) {
      answersSkipped++;
      continue;
    }

    const modifiedAt = new Date(a['Modified Date'] || a['Created Date'] || '1970-01-01');

    if (a['List Table Row']) {
      // List table answer - only keep if from the LATEST sheet version
      const latestBubbleSheetId = latestBubbleSheetForComposite.get(compositeSheetId);

      if (a.Sheet === latestBubbleSheetId) {
        // This answer is from the latest sheet version - keep it
        const answerKey = `${compositeSheetId}|${questionId}|${a['List Table Row']}|${a['List Table Column'] || ''}`;
        const existing = latestAnswers.get(answerKey);
        if (!existing || modifiedAt > existing.modifiedAt) {
          latestAnswers.set(answerKey, {
            compositeSheetId,
            questionId,
            listTableRowId: a['List Table Row'],
            listTableColumnId: a['List Table Column'] || '',
            modifiedAt,
            raw: a
          });
        }
        listTableKept++;
      } else {
        // Skip - it's from an older sheet version
        listTableFiltered++;
      }
    } else {
      // Non-list-table answer - keep most recent across all versions
      const answerKey = `${compositeSheetId}|${questionId}||`;
      const existing = latestAnswers.get(answerKey);
      if (!existing || modifiedAt > existing.modifiedAt) {
        latestAnswers.set(answerKey, {
          compositeSheetId,
          questionId,
          listTableRowId: '',
          listTableColumnId: '',
          modifiedAt,
          raw: a
        });
      }
    }
  }

  console.log(`  Filtered to ${latestAnswers.size} most-recent answers`);
  console.log(`  Skipped ${answersSkipped} answers (no sheet/question mapping)`);
  console.log(`  List table: ${listTableKept} kept from latest version, ${listTableFiltered} filtered from older versions`);

  // Insert answers in batches
  let inserted = 0;
  let batch: any[] = [];

  for (const [, candidate] of latestAnswers) {
    const a = candidate.raw;

    const choiceId = a.Choice
      ? bubbleToSupabase.choice.get(a.Choice)
      : null;

    const ltColId = a['List Table Column']
      ? bubbleToSupabase.listTableColumn.get(a['List Table Column'])
      : null;

    batch.push({
      id: randomUUID(),
      sheet_id: candidate.compositeSheetId,
      question_id: candidate.questionId,
      text_value: a.text || a['text-area'] || null,
      number_value: a.Number ?? null,
      boolean_value: a.Boolean ?? null,
      date_value: a.Date || null,
      choice_id: choiceId,
      list_table_row_id: candidate.listTableRowId || null,
      list_table_column_id: ltColId,
      created_at: a['Created Date'] || null,
      modified_at: a['Modified Date'] || null
    });

    if (batch.length >= 500) {
      const { error } = await supabase.from('answers').insert(batch);
      if (error) {
        console.error(`  Batch insert error: ${error.message}`);
        // Try one by one on error
        for (const ans of batch) {
          const { error: e2 } = await supabase.from('answers').insert(ans);
          if (!e2) inserted++;
        }
      } else {
        inserted += batch.length;
      }
      batch = [];

      if (inserted % 10000 === 0) {
        console.log(`  Inserted ${inserted}/${latestAnswers.size} answers...`);
      }
    }
  }

  // Final batch
  if (batch.length > 0) {
    const { error } = await supabase.from('answers').insert(batch);
    if (error) {
      console.error(`  Final batch error: ${error.message}`);
      for (const ans of batch) {
        const { error: e2 } = await supabase.from('answers').insert(ans);
        if (!e2) inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log('\n===============================================');
  console.log('   Import Complete!');
  console.log('===============================================');
  console.log(`Companies: ${companies.length}`);
  console.log(`Users: ${users.length}`);
  console.log(`Sections: ${sections.length}`);
  console.log(`Subsections: ${subsections.length}`);
  console.log(`Tags: ${bubbleToSupabase.tag.size}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Choices: ${choices.length}`);
  console.log(`List Table Columns: ${listTableColumns.length}`);
  console.log(`Sheets (composite): ${sheetGroups.size}`);
  console.log(`Answers (most recent): ${inserted}`);
}

main().catch(console.error);

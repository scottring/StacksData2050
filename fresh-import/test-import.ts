/**
 * Test Import - Just 5 sheets to verify the pipeline
 *
 * Uses cached exports and only imports a small subset for testing.
 * Run: npx tsx fresh-import/test-import.ts
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

// Number of sheets to test with
const TEST_SHEET_LIMIT = 5;

function loadCachedData(tableName: string): any[] {
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cache file not found: ${filePath}. Run full export first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function fetchAnswersForSheets(bubbleSheetIds: string[]): Promise<any[]> {
  console.log(`  Fetching answers for ${bubbleSheetIds.length} sheets from Bubble...`);

  const allAnswers: any[] = [];

  for (const sheetId of bubbleSheetIds) {
    let cursor = 0;

    while (true) {
      try {
        const url = `${BUBBLE_API_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheetId}"}]&limit=100&cursor=${cursor}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` }
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`  Error fetching answers for sheet ${sheetId}: ${response.status}`);
          break;
        }

        const data: any = await response.json();
        const results = data.response?.results || [];

        if (results.length === 0) break;

        allAnswers.push(...results);

        if (!data.response?.remaining || data.response.remaining === 0) break;
        cursor += results.length;
      } catch (error: any) {
        console.error(`  Error: ${error.message}`);
        break;
      }
    }
  }

  console.log(`  Fetched ${allAnswers.length} answers`);
  return allAnswers;
}

async function main() {
  console.log('===============================================');
  console.log('   Test Import: 5 Sheets Only');
  console.log('===============================================\n');

  // Load cached data
  console.log('Loading cached exports...');
  const companies = loadCachedData('company');
  const users = loadCachedData('user');
  const sections = loadCachedData('section');
  const subsections = loadCachedData('subsection');
  const tags = loadCachedData('tag');
  const questions = loadCachedData('question');
  const choices = loadCachedData('choice');
  const listTableColumns = loadCachedData('listtablecolumn');
  const allSheets = loadCachedData('sheet');

  console.log(`  Loaded ${companies.length} companies`);
  console.log(`  Loaded ${allSheets.length} sheets (will only use ${TEST_SHEET_LIMIT})`);

  // Pick test sheets - find ones with good data variety
  const testSheetNames = [
    'Hydrocarb 60 BE', // Has multiple versions - good for testing dedup
    'Kathon 886 MW', // Known sheet with chemical data
  ];

  // Find sheets matching these names, or just take first 5 if not found
  let testSheets = allSheets.filter((s: any) =>
    testSheetNames.some(name => s.Name?.includes(name))
  );

  if (testSheets.length < TEST_SHEET_LIMIT) {
    // Add more sheets to reach our limit
    const additionalSheets = allSheets
      .filter((s: any) => !testSheets.some((ts: any) => ts._id === s._id))
      .slice(0, TEST_SHEET_LIMIT - testSheets.length);
    testSheets = [...testSheets, ...additionalSheets];
  }

  testSheets = testSheets.slice(0, TEST_SHEET_LIMIT);

  console.log(`\nTest sheets selected:`);
  for (const s of testSheets) {
    console.log(`  - ${s.Name} (${s._id})`);
  }

  // Get all bubble sheet IDs for answers query
  const testSheetBubbleIds = testSheets.map((s: any) => s._id);

  // Fetch answers for these sheets
  const answers = await fetchAnswersForSheets(testSheetBubbleIds);

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

  // ============================================================
  // Import to Supabase
  // ============================================================
  console.log('\n=== Importing to Supabase ===\n');

  // 1. Import Companies (all, as they may be referenced)
  console.log('[1/10] Importing companies...');
  for (const c of companies) {
    const id = randomUUID();
    bubbleToSupabase.company.set(c._id, id);

    await supabase.from('companies').upsert({
      id,
      name: c.Name || 'Unknown',
      location: c['location text'] || null,
      type: c['Show as supplier'] ? 'supplier' : 'customer',
      bubble_id: c._id,
      created_at: c['Created Date'],
      modified_at: c['Modified Date']
    }, { onConflict: 'bubble_id' });
  }
  console.log(`  Imported ${companies.length} companies`);

  // 2. Import Users
  console.log('[2/10] Importing users...');
  for (const u of users) {
    const id = randomUUID();
    bubbleToSupabase.user.set(u._id, id);
    const companyId = u.Company ? bubbleToSupabase.company.get(u.Company) : null;

    await supabase.from('users').upsert({
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
  }
  console.log(`  Imported ${users.length} users`);

  // 3. Import Sections
  console.log('[3/10] Importing sections...');
  for (const s of sections) {
    const id = randomUUID();
    bubbleToSupabase.section.set(s._id, id);

    await supabase.from('sections').upsert({
      id,
      name: s.Name || 'Unnamed Section',
      order_number: Math.round(s.Order || 1),
      help_text: s.Help || null,
      bubble_id: s._id,
      created_at: s['Created Date']
    }, { onConflict: 'bubble_id' });
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

    await supabase.from('subsections').upsert({
      id,
      name: ss.Name || 'Unnamed Subsection',
      order_number: Math.round(ss.Order || 1),
      section_id: parentSectionId,
      bubble_id: ss._id,
      created_at: ss['Created Date']
    }, { onConflict: 'bubble_id' });
  }
  console.log(`  Imported ${subsections.length} subsections`);

  // 5. Import Tags
  console.log('[5/10] Importing tags...');
  for (const t of tags) {
    if (!t.Name) continue;
    const id = randomUUID();
    bubbleToSupabase.tag.set(t._id, id);

    await supabase.from('tags').upsert({
      id,
      name: t.Name,
      description: t.Description || null,
      bubble_id: t._id,
      created_at: t['Created Date']
    }, { onConflict: 'bubble_id' });
  }
  console.log(`  Imported ${bubbleToSupabase.tag.size} tags`);

  // 6. Import Questions
  console.log('[6/10] Importing questions...');
  for (const q of questions) {
    const id = randomUUID();
    bubbleToSupabase.question.set(q._id, id);

    const parentSubsectionId = q['Parent Subsection']
      ? bubbleToSupabase.subsection.get(q['Parent Subsection'])
      : null;

    const parentSectionId = q['Parent Section']
      ? bubbleToSupabase.section.get(q['Parent Section'])
      : null;

    await supabase.from('questions').upsert({
      id,
      name: q.Name || 'Unnamed Question',
      content: q.Name || '',
      response_type: q.Type || 'Single text line',
      order_number: Math.round(q.Order || q.ID || 1),
      section_sort_number: q['SECTION SORT NUMBER'] || null,
      subsection_sort_number: q['SUBSECTION SORT NUMBER'] || null,
      subsection_id: parentSubsectionId,
      bubble_id: q._id,
      created_at: q['Created Date']
    }, { onConflict: 'bubble_id' });
  }
  console.log(`  Imported ${questions.length} questions`);

  // 6b. Question-Tag relationships
  console.log('  Importing question-tag relationships...');
  let qtCount = 0;
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
      if (!error) qtCount++;
    }
  }
  console.log(`  Imported ${qtCount} question-tag relationships`);

  // 7. Import Choices
  console.log('[7/10] Importing choices...');
  for (const c of choices) {
    const id = randomUUID();
    bubbleToSupabase.choice.set(c._id, id);

    const parentQuestionId = c['Parent Question']
      ? bubbleToSupabase.question.get(c['Parent Question'])
      : null;

    await supabase.from('choices').upsert({
      id,
      content: c.Content || c['Choice Text'] || 'Unknown',
      order_number: Math.round(c.Order || 1),
      question_id: parentQuestionId,
      bubble_id: c._id,
      created_at: c['Created Date']
    }, { onConflict: 'bubble_id' });
  }
  console.log(`  Imported ${choices.length} choices`);

  // 8. Import List Table Columns
  console.log('[8/10] Importing list table columns...');
  for (const ltc of listTableColumns) {
    const id = randomUUID();
    bubbleToSupabase.listTableColumn.set(ltc._id, id);

    await supabase.from('list_table_columns').upsert({
      id,
      name: ltc.Name || 'Unnamed Column',
      order_number: Math.round(ltc.Order || 1),
      response_type: ltc['Input Type'] || 'text',
      choice_options: ltc['Choice Options'] || null,
      bubble_id: ltc._id,
      created_at: ltc['Created Date']
    }, { onConflict: 'bubble_id' });
  }
  console.log(`  Imported ${listTableColumns.length} list table columns`);

  // 9. Import Test Sheets with Composite Logic
  console.log(`[9/10] Importing ${testSheets.length} test sheets...`);

  // Group by name + company
  interface SheetGroup {
    name: string;
    companyBubbleId: string;
    versions: any[];
  }

  const sheetGroups = new Map<string, SheetGroup>();

  for (const s of testSheets) {
    const name = s.Name || 'Unknown Product';
    const companyId = s.Company || s['Sup Assigned to'] || '';
    const key = `${name.toLowerCase()}|${companyId}`;

    if (!sheetGroups.has(key)) {
      sheetGroups.set(key, { name, companyBubbleId: companyId, versions: [] });
    }
    sheetGroups.get(key)!.versions.push(s);
  }

  const bubbleSheetToCompositeSheet = new Map<string, string>();
  const latestBubbleSheetForComposite = new Map<string, string>(); // compositeId -> latest bubble sheet ID

  for (const [, group] of sheetGroups) {
    group.versions.sort((a, b) =>
      new Date(b['Modified Date'] || 0).getTime() - new Date(a['Modified Date'] || 0).getTime()
    );

    const latest = group.versions[0];
    const id = randomUUID();

    // Track the latest version's bubble ID for list table deduplication
    latestBubbleSheetForComposite.set(id, latest._id);

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
      bubble_id: latest._id,
      created_at: latest['Created Date'],
      modified_at: latest['Modified Date']
    }, { onConflict: 'bubble_id' });

    if (error) console.error(`  Sheet error: ${error.message}`);

    // Merge tags
    const allTags = new Set<string>();
    for (const v of group.versions) {
      if (v.Tags && Array.isArray(v.Tags)) {
        for (const t of v.Tags) {
          const tagId = bubbleToSupabase.tag.get(t);
          if (tagId) allTags.add(tagId);
        }
      }
    }

    for (const tagId of allTags) {
      await supabase.from('sheet_tags').upsert({
        sheet_id: id,
        tag_id: tagId
      }, { onConflict: 'sheet_id,tag_id', ignoreDuplicates: true });
    }
  }

  console.log(`  Created ${sheetGroups.size} composite sheets`);

  // 10. Import Answers with Version-Based Deduplication
  console.log('[10/10] Importing answers...');

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
  let listTableKept = 0;
  let listTableFiltered = 0;

  for (const a of answers) {
    if (!a.Sheet) continue;

    const compositeSheetId = bubbleSheetToCompositeSheet.get(a.Sheet);
    if (!compositeSheetId) continue;

    const questionId = bubbleToSupabase.question.get(a['Parent Question']);
    if (!questionId) continue;

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
  console.log(`  List table: ${listTableKept} kept from latest version, ${listTableFiltered} filtered from older versions`);

  // Insert answers
  let inserted = 0;
  for (const [, candidate] of latestAnswers) {
    const a = candidate.raw;

    const choiceId = a.Choice ? bubbleToSupabase.choice.get(a.Choice) : null;
    const ltColId = a['List Table Column']
      ? bubbleToSupabase.listTableColumn.get(a['List Table Column'])
      : null;

    const { error } = await supabase.from('answers').insert({
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

    if (!error) inserted++;
  }

  console.log(`  Inserted ${inserted} answers`);

  // Summary
  console.log('\n===============================================');
  console.log('   Test Import Complete!');
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
  console.log(`Answers: ${inserted}`);

  console.log('\n=== Test Sheet IDs ===');
  for (const [key, id] of bubbleToSupabase.sheet) {
    const sheet = testSheets.find((s: any) => s._id === key);
    if (sheet) {
      console.log(`${sheet.Name}: ${id}`);
    }
  }
}

main().catch(console.error);

/**
 * Import Answers Only
 *
 * Imports answers for already-imported sheets.
 * Uses the composite sheet logic: for each question, take the most recent answer.
 *
 * Has retry logic for Bubble API failures.
 */
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Rate limiting - fast by default, rely on retry for errors
const REQUESTS_PER_MINUTE = 200;
const REQUEST_INTERVAL = 60000 / REQUESTS_PER_MINUTE; // ~300ms between requests
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
          console.log(`  Bubble API error ${response.status}, attempt ${attempt}/${retries}, waiting ${attempt * 30}s...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 30000));
          continue;
        }
        throw new Error(`Bubble API error: ${response.status} ${text.substring(0, 200)}`);
      }

      return await response.json();
    } catch (error: any) {
      if (attempt === retries) throw error;
      console.log(`  Network error, attempt ${attempt}/${retries}, waiting ${attempt * 30}s...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 30000));
    }
  }
}

async function* fetchAllAnswers(): AsyncGenerator<any> {
  let cursor = 0;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchBubbleWithRetry('answer', cursor);
    const results = data.response?.results || [];

    for (const item of results) {
      yield item;
    }

    hasMore = data.response?.remaining > 0;
    cursor += results.length;
  }
}

async function main() {
  console.log('===============================================');
  console.log('   Import Answers Only');
  console.log('===============================================\n');

  // Step 1: Load existing sheets from Supabase to build mapping
  console.log('[1/4] Loading sheets from Supabase...');
  const { data: sheets, error: sheetsError } = await supabase
    .from('sheets')
    .select('id, name, company_id');

  if (sheetsError) throw new Error(`Failed to load sheets: ${sheetsError.message}`);
  console.log(`  Loaded ${sheets?.length} sheets`);

  // Step 2: Load all sheets from Bubble to build bubble_id -> supabase_sheet mapping
  console.log('\n[2/4] Loading sheet mappings from Bubble...');

  interface BubbleSheet {
    _id: string;
    Name: string;
    Company: string;
    'Sup Assigned to': string;
  }

  // Group Supabase sheets by name+company for matching
  const supabaseSheetMap = new Map<string, string>(); // key: nameLower|companyBubbleId -> supabaseId

  // We need to also load companies to map company bubble IDs
  const { data: companies } = await supabase.from('companies').select('id, name');
  const companyNameToId = new Map<string, string>();
  companies?.forEach(c => companyNameToId.set(c.name.toLowerCase(), c.id));

  // Load questions for mapping
  const { data: questions } = await supabase.from('questions').select('id, name');
  const questionNameToId = new Map<string, string>();
  questions?.forEach(q => questionNameToId.set(q.name?.toLowerCase() || '', q.id));
  console.log(`  Loaded ${questions?.length} questions`);

  // Load choices for mapping
  const { data: choices } = await supabase.from('choices').select('id, content');
  const choiceContentToId = new Map<string, string>();
  choices?.forEach(c => choiceContentToId.set(c.content?.toLowerCase() || '', c.id));
  console.log(`  Loaded ${choices?.length} choices`);

  // Load list_table_columns for mapping
  const { data: ltCols } = await supabase.from('list_table_columns').select('id, name');
  const ltColNameToId = new Map<string, string>();
  ltCols?.forEach(c => ltColNameToId.set(c.name?.toLowerCase() || '', c.id));
  console.log(`  Loaded ${ltCols?.length} list_table_columns`);

  // Build bubble sheet ID -> supabase sheet ID mapping
  // We need to fetch Bubble sheets to get their IDs
  console.log('\n[3/4] Building sheet ID mapping...');

  let bubbleSheetCursor = 0;
  let bubbleSheetCount = 0;
  const bubbleToSupabaseSheet = new Map<string, string>();

  // First, create a map of supabase sheets by name (lowercase)
  const supabaseSheetsByName = new Map<string, { id: string; companyId: string | null }[]>();
  sheets?.forEach(s => {
    const key = s.name.toLowerCase();
    if (!supabaseSheetsByName.has(key)) {
      supabaseSheetsByName.set(key, []);
    }
    supabaseSheetsByName.get(key)!.push({ id: s.id, companyId: s.company_id });
  });

  // Fetch Bubble sheets and match to Supabase
  while (true) {
    const data = await fetchBubbleWithRetry('sheet', bubbleSheetCursor);
    const results = data.response?.results || [];
    if (results.length === 0) break;

    for (const bs of results) {
      const nameLower = (bs.Name || '').toLowerCase();
      const supabaseMatches = supabaseSheetsByName.get(nameLower);
      if (supabaseMatches && supabaseMatches.length > 0) {
        // Use first match (for composite sheets, all bubble versions map to same supabase sheet)
        bubbleToSupabaseSheet.set(bs._id, supabaseMatches[0].id);
      }
      bubbleSheetCount++;
    }

    if (!data.response?.remaining) break;
    bubbleSheetCursor += results.length;
    if (bubbleSheetCount % 500 === 0) console.log(`  Processed ${bubbleSheetCount} Bubble sheets...`);
  }

  console.log(`  Mapped ${bubbleToSupabaseSheet.size} Bubble sheets to ${sheets?.length} Supabase sheets`);

  // Step 3: Load questions from Bubble for ID mapping
  console.log('\n  Building question ID mapping...');
  const bubbleToSupabaseQuestion = new Map<string, string>();
  let bubbleQuestionCursor = 0;

  while (true) {
    const data = await fetchBubbleWithRetry('question', bubbleQuestionCursor);
    const results = data.response?.results || [];
    if (results.length === 0) break;

    for (const bq of results) {
      const nameLower = (bq.Name || '').toLowerCase();
      const supabaseId = questionNameToId.get(nameLower);
      if (supabaseId) {
        bubbleToSupabaseQuestion.set(bq._id, supabaseId);
      }
    }

    if (!data.response?.remaining) break;
    bubbleQuestionCursor += results.length;
  }
  console.log(`  Mapped ${bubbleToSupabaseQuestion.size} questions`);

  // Build choice mapping
  console.log('  Building choice ID mapping...');
  const bubbleToSupabaseChoice = new Map<string, string>();
  let bubbleChoiceCursor = 0;

  while (true) {
    const data = await fetchBubbleWithRetry('choice', bubbleChoiceCursor);
    const results = data.response?.results || [];
    if (results.length === 0) break;

    for (const bc of results) {
      const content = (bc.Content || bc['Choice Text'] || '').toLowerCase();
      const supabaseId = choiceContentToId.get(content);
      if (supabaseId) {
        bubbleToSupabaseChoice.set(bc._id, supabaseId);
      }
    }

    if (!data.response?.remaining) break;
    bubbleChoiceCursor += results.length;
  }
  console.log(`  Mapped ${bubbleToSupabaseChoice.size} choices`);

  // Build list_table_column mapping
  console.log('  Building list_table_column ID mapping...');
  const bubbleToSupabaseLTCol = new Map<string, string>();
  let bubbleLTColCursor = 0;

  while (true) {
    const data = await fetchBubbleWithRetry('listtablecolumn', bubbleLTColCursor);
    const results = data.response?.results || [];
    if (results.length === 0) break;

    for (const bc of results) {
      const name = (bc.Name || '').toLowerCase();
      const supabaseId = ltColNameToId.get(name);
      if (supabaseId) {
        bubbleToSupabaseLTCol.set(bc._id, supabaseId);
      }
    }

    if (!data.response?.remaining) break;
    bubbleLTColCursor += results.length;
  }
  console.log(`  Mapped ${bubbleToSupabaseLTCol.size} list_table_columns`);

  // Step 4: Load all answers and keep most recent per question
  console.log('\n[4/4] Loading answers and finding most recent per question...');

  interface AnswerCandidate {
    newSheetId: string;
    questionId: string;
    modifiedAt: Date;
    raw: any;
  }

  const latestAnswers = new Map<string, AnswerCandidate>();
  let answersLoaded = 0;
  let answersSkipped = 0;

  for await (const a of fetchAllAnswers()) {
    answersLoaded++;
    if (answersLoaded % 50000 === 0) {
      console.log(`  Processed ${answersLoaded} answers, kept ${latestAnswers.size}...`);
    }

    if (!a.Sheet) {
      answersSkipped++;
      continue;
    }

    const newSheetId = bubbleToSupabaseSheet.get(a.Sheet);
    if (!newSheetId) {
      answersSkipped++;
      continue;
    }

    const questionId = bubbleToSupabaseQuestion.get(a['Parent Question']);
    if (!questionId) {
      answersSkipped++;
      continue;
    }

    const listTableRowId = a['List Table Row'] || '';
    const listTableColumnId = a['List Table Column'] || '';
    const key = `${newSheetId}|${questionId}|${listTableRowId}|${listTableColumnId}`;

    const modifiedAt = new Date(a['Modified Date'] || a['Created Date'] || '1970-01-01');

    const existing = latestAnswers.get(key);
    if (!existing || modifiedAt > existing.modifiedAt) {
      latestAnswers.set(key, {
        newSheetId,
        questionId,
        modifiedAt,
        raw: a
      });
    }
  }

  console.log(`  Filtered to ${latestAnswers.size} most-recent answers (from ${answersLoaded} total)`);

  // Insert answers
  console.log('\n  Inserting answers...');
  let inserted = 0;
  let batch: any[] = [];

  for (const [, candidate] of latestAnswers) {
    const a = candidate.raw;

    batch.push({
      id: randomUUID(),
      sheet_id: candidate.newSheetId,
      question_id: candidate.questionId,
      text_value: a.text || a['text-area'] || null,
      number_value: a.Number ?? null,
      boolean_value: a.Boolean ?? null,
      date_value: a.Date || null,
      choice_id: a.Choice ? bubbleToSupabaseChoice.get(a.Choice) || null : null,
      list_table_row_id: a['List Table Row'] || null,
      list_table_column_id: a['List Table Column'] ? bubbleToSupabaseLTCol.get(a['List Table Column']) || null : null,
      created_at: a['Created Date'] || null,
      modified_at: a['Modified Date'] || null
    });

    if (batch.length >= 500) {
      const { error } = await supabase.from('answers').insert(batch);
      if (error) {
        console.error(`  Batch insert error: ${error.message}`);
        // Try one by one
        for (const ans of batch) {
          const { error: e2 } = await supabase.from('answers').insert(ans);
          if (!e2) inserted++;
        }
      } else {
        inserted += batch.length;
      }
      batch = [];
      console.log(`  Inserted ${inserted}/${latestAnswers.size} answers`);
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

  console.log(`\n===============================================`);
  console.log(`   Import Complete`);
  console.log(`   Answers: ${inserted}`);
  console.log(`===============================================`);
}

main().catch(console.error);

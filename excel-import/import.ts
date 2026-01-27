/**
 * Excel Import Script
 *
 * Imports answers from filled Excel templates into sheets.
 *
 * Usage:
 *   npx tsx excel-import/import.ts <excel-path> <sheet-id> [--execute]
 *
 * Prerequisites:
 * 1. Run build-question-map.ts to generate question-map.json
 * 2. Configure tab-configs.ts for your Excel template layout
 *
 * Process:
 * 1. Load tab configs and question map
 * 2. Parse Excel using tab configs
 * 3. Fuzzy match question text → question_id
 * 4. Extract answers from configured answer columns
 * 5. Handle list tables per config
 * 6. Insert answers into sheet
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import { TAB_CONFIGS, columnToIndex, TabConfig, ListTableConfig } from './tab-configs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// Question Map Loading
// ============================================================================

interface QuestionMapEntry {
  id: string;
  name: string;
  content: string;
  responseType: string;
  fullNumber: string;
  normalized: string;
  tags: string[];
}

let questionMap: QuestionMapEntry[] = [];

function loadQuestionMap() {
  const mapPath = path.join(__dirname, 'question-map.json');
  if (!fs.existsSync(mapPath)) {
    throw new Error('question-map.json not found. Run: npx tsx excel-import/build-question-map.ts');
  }
  questionMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
  console.log(`Loaded ${questionMap.length} questions from map`);
}

// ============================================================================
// Fuzzy Matching
// ============================================================================

function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function matchQuestion(excelText: string, sheetTags: string[]): QuestionMapEntry | null {
  const normalized = normalizeText(excelText);
  if (!normalized || normalized.length < 5) return null;

  // First, try exact match on normalized content
  const exactMatch = questionMap.find(q => q.normalized === normalized);
  if (exactMatch) return exactMatch;

  // Then try "contains" match (question text might be truncated in Excel)
  const containsMatch = questionMap.find(q =>
    q.normalized.includes(normalized) || normalized.includes(q.normalized)
  );
  if (containsMatch) return containsMatch;

  // Filter by sheet tags if provided
  let candidates = questionMap;
  if (sheetTags.length > 0) {
    const taggedCandidates = questionMap.filter(q =>
      q.tags.some(t => sheetTags.includes(t))
    );
    if (taggedCandidates.length > 0) {
      candidates = taggedCandidates;
    }
  }

  // Fuzzy match with Levenshtein distance
  let bestMatch: QuestionMapEntry | null = null;
  let bestScore = Infinity;

  for (const q of candidates) {
    // Skip if lengths are too different
    if (Math.abs(q.normalized.length - normalized.length) > 50) continue;

    const distance = levenshteinDistance(q.normalized.substring(0, 100), normalized.substring(0, 100));
    const similarity = 1 - (distance / Math.max(q.normalized.length, normalized.length, 1));

    if (similarity > 0.7 && distance < bestScore) {
      bestScore = distance;
      bestMatch = q;
    }
  }

  return bestMatch;
}

// ============================================================================
// Excel Parsing
// ============================================================================

interface ExtractedAnswer {
  questionId: string;
  value: string;
  listTableRowId?: string;
  listTableColumnIndex?: number;
}

function extractAnswersFromTab(
  worksheet: XLSX.WorkSheet,
  config: TabConfig,
  sheetTags: string[]
): ExtractedAnswer[] {
  const answers: ExtractedAnswer[] = [];

  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: ''
  });

  const questionCol = columnToIndex(config.questionColumn);
  const answerCol = columnToIndex(config.answerColumn);

  // Process regular questions (not list tables)
  for (let rowIdx = config.answerStartRow - 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    const rowNum = rowIdx + 1;  // 1-based row number

    // Skip configured skip rows
    if (config.skipRows?.includes(rowNum)) continue;
    if (config.sectionHeaderRows?.includes(rowNum)) continue;

    // Check if this row is inside a list table region
    const inListTable = config.listTables.some(lt =>
      rowNum >= lt.startRow && (lt.endRow === -1 || rowNum <= lt.endRow)
    );
    if (inListTable) continue;

    const questionText = String(row[questionCol] || '').trim();
    const answerValue = String(row[answerCol] || '').trim();

    if (!questionText || !answerValue) continue;
    if (answerValue === '0' || answerValue.toLowerCase() === 'n/a') continue;

    // Check for explicit mapping first (by row number)
    let question: QuestionMapEntry | null = null;
    if (config.explicitMappings && config.explicitMappings[rowNum]) {
      const fullNumber = config.explicitMappings[rowNum];
      if (fullNumber === 'SKIP') {
        // Explicitly marked to skip this row (no matching question in database)
        continue;
      }
      question = questionMap.find(q => q.fullNumber === fullNumber) || null;
    }

    // Fall back to fuzzy text matching
    if (!question) {
      question = matchQuestion(questionText, sheetTags);
    }

    if (question) {
      answers.push({
        questionId: question.id,
        value: answerValue
      });
    }
  }

  // Process list tables
  for (const listTable of config.listTables) {
    const listTableAnswers = extractListTableAnswers(data, listTable, sheetTags);
    answers.push(...listTableAnswers);
  }

  return answers;
}

function extractListTableAnswers(
  data: any[][],
  config: ListTableConfig,
  sheetTags: string[]
): ExtractedAnswer[] {
  const answers: ExtractedAnswer[] = [];
  const colIndices = config.columns.map(c => columnToIndex(c));

  // Find the parent question for this list table
  let parentQuestionId = 'LIST_TABLE_PLACEHOLDER';
  if (config.questionId) {
    const parentQuestion = questionMap.find(q => q.fullNumber === config.questionId);
    if (parentQuestion) {
      parentQuestionId = parentQuestion.id;
    } else {
      console.warn(`  Warning: List table question ${config.questionId} not found in question map`);
    }
  }

  let endRow = config.endRow;
  if (endRow === -1) {
    // Find last non-empty row
    endRow = data.length;
    for (let i = config.startRow - 1; i < data.length; i++) {
      const row = data[i];
      const hasContent = colIndices.some(ci => {
        const val = String(row?.[ci] || '').trim();
        return val && val !== '0' && val.toLowerCase() !== 'n/a';
      });
      if (!hasContent) {
        endRow = i;
        break;
      }
    }
  }

  // Each row in the list table gets a unique row ID
  for (let rowIdx = config.startRow - 1; rowIdx < endRow; rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    // Check if row has any real values
    const hasContent = colIndices.some(ci => {
      const val = String(row[ci] || '').trim();
      return val && val !== '0' && val.toLowerCase() !== 'n/a';
    });
    if (!hasContent) continue;

    const listTableRowId = randomUUID();

    // Extract each column as a separate answer
    for (let colArrayIdx = 0; colArrayIdx < colIndices.length; colArrayIdx++) {
      const colIdx = colIndices[colArrayIdx];
      const value = String(row[colIdx] || '').trim();

      if (value && value !== '0' && value.toLowerCase() !== 'n/a') {
        answers.push({
          questionId: parentQuestionId,
          value,
          listTableRowId,
          listTableColumnIndex: colArrayIdx
        });
      }
    }
  }

  return answers;
}

// ============================================================================
// Main Import Function
// ============================================================================

async function importExcel(excelPath: string, sheetId: string, dryRun: boolean) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXCEL IMPORT ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  // Load question map
  loadQuestionMap();

  // Verify sheet exists
  const { data: sheet, error: sheetError } = await supabase
    .from('sheets')
    .select(`
      id, name, company_id,
      sheet_tags ( tags (name) )
    `)
    .eq('id', sheetId)
    .single();

  if (sheetError || !sheet) {
    throw new Error(`Sheet not found: ${sheetId}`);
  }

  const sheetTags = (sheet.sheet_tags as any[])?.map((st: any) =>
    st.tags?.name
  ).filter(Boolean) || [];

  console.log(`Sheet: ${sheet.name}`);
  console.log(`Tags: ${sheetTags.join(', ') || '(none)'}`);

  // Parse Excel
  console.log(`\nParsing: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  console.log(`Found tabs: ${workbook.SheetNames.join(', ')}`);

  // Extract answers from each configured tab
  const allAnswers: ExtractedAnswer[] = [];

  for (const config of TAB_CONFIGS) {
    const worksheet = workbook.Sheets[config.tabName];
    if (!worksheet) {
      console.log(`  Skipping ${config.tabName} (not found)`);
      continue;
    }

    console.log(`\nProcessing tab: ${config.tabName}`);
    const tabAnswers = extractAnswersFromTab(worksheet, config, sheetTags);
    console.log(`  Found ${tabAnswers.length} answers`);
    allAnswers.push(...tabAnswers);
  }

  // Separate regular answers from list table answers (identified by listTableRowId)
  const regularAnswers = allAnswers.filter(a => !a.listTableRowId);
  const listTableAnswers = allAnswers.filter(a => a.listTableRowId);

  // Check for any list table answers without proper question mapping
  const unmappedListTableAnswers = listTableAnswers.filter(a => a.questionId === 'LIST_TABLE_PLACEHOLDER');
  if (unmappedListTableAnswers.length > 0) {
    console.log(`  Warning: ${unmappedListTableAnswers.length} list table cells have no parent question mapping`);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`Regular answers: ${regularAnswers.length}`);
  console.log(`List table cells: ${listTableAnswers.length}`);

  if (regularAnswers.length === 0) {
    console.log('\nNo answers to import.');
    return;
  }

  // Get choice mappings for dropdown questions
  const { data: choices } = await supabase
    .from('choices')
    .select('id, question_id, content');

  const choicesByQuestionId = new Map<string, any[]>();
  for (const c of choices || []) {
    const arr = choicesByQuestionId.get(c.question_id) || [];
    arr.push(c);
    choicesByQuestionId.set(c.question_id, arr);
  }

  // Build insert records
  const answersToInsert: any[] = [];

  for (const answer of regularAnswers) {
    const question = questionMap.find(q => q.id === answer.questionId);
    if (!question) continue;

    const record: any = {
      id: randomUUID(),
      sheet_id: sheetId,
      question_id: answer.questionId,
      company_id: sheet.company_id,
      created_at: new Date().toISOString()
    };

    // Type-specific value handling
    const type = question.responseType.toLowerCase();

    if (type.includes('choice') || type.includes('dropdown') || type.includes('select')) {
      const qChoices = choicesByQuestionId.get(answer.questionId) || [];
      const normalizedValue = normalizeText(answer.value);

      const matchedChoice = qChoices.find(c =>
        normalizeText(c.content) === normalizedValue
      );

      if (matchedChoice) {
        record.choice_id = matchedChoice.id;
      } else {
        record.text_value = answer.value;
      }
    } else if (type.includes('number')) {
      const num = parseFloat(answer.value);
      if (!isNaN(num)) {
        record.number_value = num;
      } else {
        record.text_value = answer.value;
      }
    } else if (type.includes('boolean') || type.includes('yes')) {
      const lower = answer.value.toLowerCase();
      if (lower === 'yes' || lower === 'true' || lower === '1') {
        record.boolean_value = true;
      } else if (lower === 'no' || lower === 'false' || lower === '0') {
        record.boolean_value = false;
      } else {
        record.text_value = answer.value;
      }
    } else if (type.includes('date')) {
      const date = new Date(answer.value);
      if (!isNaN(date.getTime())) {
        record.date_value = date.toISOString().split('T')[0];
      } else {
        record.text_value = answer.value;
      }
    } else {
      record.text_value = answer.value;
    }

    answersToInsert.push(record);
  }

  console.log(`\nPrepared ${answersToInsert.length} answers for insert`);

  // Sample preview
  console.log('\nSample answers:');
  answersToInsert.slice(0, 5).forEach(a => {
    const q = questionMap.find(q => q.id === a.question_id);
    console.log(`  ${q?.fullNumber || '?'}: ${a.text_value || a.choice_id || a.number_value || a.boolean_value}`);
  });

  if (!dryRun && answersToInsert.length > 0) {
    console.log('\nInserting answers...');

    // Batch insert
    for (let i = 0; i < answersToInsert.length; i += 100) {
      const batch = answersToInsert.slice(i, i + 100);
      const { error } = await supabase.from('answers').insert(batch);

      if (error) {
        console.error(`Error at batch ${Math.floor(i / 100)}: ${error.message}`);
      } else {
        console.log(`  Inserted ${Math.min(i + 100, answersToInsert.length)}/${answersToInsert.length}`);
      }
    }

    console.log('\nImport complete!');
  } else if (dryRun) {
    console.log('\n[DRY RUN - No data written]');
  }
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx excel-import/import.ts <excel-path> <sheet-id> [--execute]');
  console.log('');
  console.log('Options:');
  console.log('  --execute    Actually import (default is dry run)');
  console.log('');
  console.log('Prerequisites:');
  console.log('  1. Run: npx tsx excel-import/build-question-map.ts');
  console.log('  2. Configure tab-configs.ts for your Excel layout');
  process.exit(1);
}

const excelPath = args[0];
const sheetId = args[1];
const dryRun = !args.includes('--execute');

importExcel(excelPath, sheetId, dryRun).catch(console.error);

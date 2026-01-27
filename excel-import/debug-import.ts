/**
 * Debug version of import.ts to see question matching details
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { TAB_CONFIGS, columnToIndex, TabConfig } from './tab-configs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    throw new Error('question-map.json not found');
  }
  questionMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
}

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
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
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

function matchQuestion(excelText: string): { question: QuestionMapEntry | null; matchType: string } {
  const normalized = normalizeText(excelText);
  if (!normalized || normalized.length < 5) return { question: null, matchType: 'too_short' };

  // Exact match
  const exactMatch = questionMap.find(q => q.normalized === normalized);
  if (exactMatch) return { question: exactMatch, matchType: 'exact' };

  // Contains match
  const containsMatch = questionMap.find(q =>
    q.normalized.includes(normalized) || normalized.includes(q.normalized)
  );
  if (containsMatch) return { question: containsMatch, matchType: 'contains' };

  // Fuzzy match
  let bestMatch: QuestionMapEntry | null = null;
  let bestScore = Infinity;

  for (const q of questionMap) {
    if (Math.abs(q.normalized.length - normalized.length) > 50) continue;
    const distance = levenshteinDistance(q.normalized.substring(0, 100), normalized.substring(0, 100));
    const similarity = 1 - (distance / Math.max(q.normalized.length, normalized.length, 1));
    if (similarity > 0.7 && distance < bestScore) {
      bestScore = distance;
      bestMatch = q;
    }
  }

  return { question: bestMatch, matchType: bestMatch ? 'fuzzy' : 'no_match' };
}

async function debugImport(excelPath: string) {
  console.log('Loading question map...');
  loadQuestionMap();
  console.log(`Loaded ${questionMap.length} questions\n`);

  const workbook = XLSX.readFile(excelPath);

  for (const config of TAB_CONFIGS) {
    const worksheet = workbook.Sheets[config.tabName];
    if (!worksheet) continue;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`TAB: ${config.tabName}`);
    console.log(`${'='.repeat(60)}`);

    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const questionCol = columnToIndex(config.questionColumn);
    const answerCol = columnToIndex(config.answerColumn);

    let matched = 0;
    let unmatched = 0;

    for (let rowIdx = config.answerStartRow - 1; rowIdx < Math.min(data.length, 50); rowIdx++) {
      const row = data[rowIdx];
      if (!row) continue;
      if (config.skipRows?.includes(rowIdx + 1)) continue;
      if (config.sectionHeaderRows?.includes(rowIdx + 1)) continue;

      // Skip list table rows
      const inListTable = config.listTables.some(lt =>
        rowIdx + 1 >= lt.startRow && (lt.endRow === -1 || rowIdx + 1 <= lt.endRow)
      );
      if (inListTable) continue;

      const questionText = String(row[questionCol] || '').trim();
      const answerValue = String(row[answerCol] || '').trim();

      if (!questionText) continue;

      // Check explicit mappings first
      let question: QuestionMapEntry | null = null;
      let matchType = 'no_match';

      if (config.explicitMappings && config.explicitMappings[rowIdx + 1]) {
        const fullNumber = config.explicitMappings[rowIdx + 1];
        if (fullNumber === 'SKIP') {
          console.log(`⊘ Row ${rowIdx + 1}: "${questionText.substring(0, 50)}..." (SKIPPED - no DB question)`);
          if (answerValue) {
            console.log(`  Answer: ${answerValue.substring(0, 40)}`);
          }
          continue;
        }
        question = questionMap.find(q => q.fullNumber === fullNumber) || null;
        if (question) matchType = 'explicit';
      }

      // Fall back to fuzzy matching
      if (!question) {
        const result = matchQuestion(questionText);
        question = result.question;
        matchType = result.matchType;
      }

      const excelPreview = questionText.substring(0, 50);

      if (question) {
        matched++;
        console.log(`✓ Row ${rowIdx + 1}: "${excelPreview}..."`);
        console.log(`  → ${question.fullNumber} (${matchType})`);
        if (answerValue) {
          console.log(`  Answer: ${answerValue.substring(0, 40)}`);
        }
      } else if (answerValue && answerValue !== '0') {
        unmatched++;
        console.log(`✗ Row ${rowIdx + 1}: "${excelPreview}..." (${matchType})`);
        if (answerValue) {
          console.log(`  Answer: ${answerValue.substring(0, 40)}`);
        }
      }
    }

    console.log(`\nMatched: ${matched}, Unmatched: ${unmatched}`);
  }
}

const excelPath = process.argv[2];
if (!excelPath) {
  console.log('Usage: npx tsx excel-import/debug-import.ts <excel-path>');
  process.exit(1);
}

debugImport(excelPath).catch(console.error);

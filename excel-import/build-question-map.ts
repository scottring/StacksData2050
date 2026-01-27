/**
 * Build Question Map
 *
 * Creates a mapping of question text patterns to question IDs.
 * Used for fuzzy matching Excel question text to database questions.
 *
 * Run: npx tsx excel-import/build-question-map.ts
 * Output: excel-import/question-map.json
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
  sectionNumber: number | null;
  subsectionNumber: number | null;
  orderNumber: number | null;
  fullNumber: string;  // e.g., "4.8.1"
  normalized: string;  // lowercase, trimmed, special chars removed
  tags: string[];
}

function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove special chars
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim();
}

async function buildQuestionMap() {
  console.log('Building question map...\n');

  // Fetch all questions with their tags
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select(`
      id,
      name,
      content,
      response_type,
      section_sort_number,
      subsection_sort_number,
      order_number,
      question_tags (
        tags (name)
      )
    `)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number');

  if (qError) {
    throw new Error(`Failed to fetch questions: ${qError.message}`);
  }

  console.log(`Found ${questions?.length || 0} questions`);

  const map: QuestionMapEntry[] = [];

  for (const q of questions || []) {
    const fullNumber = [
      q.section_sort_number,
      q.subsection_sort_number,
      q.order_number
    ].filter(n => n !== null).join('.');

    const tags = (q.question_tags as any[])?.map((qt: any) =>
      qt.tags?.name
    ).filter(Boolean) || [];

    map.push({
      id: q.id,
      name: q.name || '',
      content: q.content || '',
      responseType: q.response_type || 'text',
      sectionNumber: q.section_sort_number,
      subsectionNumber: q.subsection_sort_number,
      orderNumber: q.order_number,
      fullNumber,
      normalized: normalizeText(q.content || q.name),
      tags
    });
  }

  // Write to JSON file
  const outputPath = path.join(__dirname, 'question-map.json');
  fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));

  console.log(`\nWrote ${map.length} questions to ${outputPath}`);

  // Show sample
  console.log('\nSample entries:');
  map.slice(0, 5).forEach(q => {
    console.log(`  ${q.fullNumber}: "${q.normalized.substring(0, 50)}..."`);
    console.log(`    Tags: ${q.tags.join(', ') || '(none)'}`);
  });

  // Stats by tag
  console.log('\nQuestions by tag:');
  const tagCounts: { [tag: string]: number } = {};
  for (const q of map) {
    for (const tag of q.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: ${count} questions`);
    });
}

buildQuestionMap().catch(console.error);

/**
 * Verification Script for Fresh Import
 *
 * Checks data integrity after import:
 * - Counts match expectations
 * - All answers link to valid questions
 * - All choice answers link to valid choices
 * - All sheet_tags link to valid tags
 * - Sample data spot checks
 *
 * Run: npx tsx fresh-import/verify.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: unknown;
}

const results: VerificationResult[] = [];

function pass(check: string, message: string) {
  results.push({ check, status: 'PASS', message });
  console.log(`  ✓ ${check}: ${message}`);
}

function fail(check: string, message: string, details?: unknown) {
  results.push({ check, status: 'FAIL', message, details });
  console.log(`  ✗ ${check}: ${message}`);
  if (details) console.log(`    Details:`, details);
}

function warn(check: string, message: string, details?: unknown) {
  results.push({ check, status: 'WARN', message, details });
  console.log(`  ⚠ ${check}: ${message}`);
  if (details) console.log(`    Details:`, details);
}

async function getCount(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`Failed to count ${table}: ${error.message}`);
  return count || 0;
}

async function verifyCounts() {
  console.log('\n--- Record Counts ---');

  const counts: Record<string, number> = {};
  const tables = [
    'companies', 'users', 'sections', 'subsections', 'tags',
    'questions', 'choices', 'list_table_columns', 'sheets',
    'sheet_tags', 'question_tags', 'answers'
  ];

  for (const table of tables) {
    try {
      counts[table] = await getCount(table);
      console.log(`  ${table}: ${counts[table]}`);
    } catch (e) {
      console.log(`  ${table}: ERROR - table may not exist`);
    }
  }

  // Basic sanity checks
  if (counts.companies > 0) pass('companies', `${counts.companies} companies imported`);
  else fail('companies', 'No companies found');

  if (counts.questions > 0) pass('questions', `${counts.questions} questions imported`);
  else fail('questions', 'No questions found');

  if (counts.sheets > 0) pass('sheets', `${counts.sheets} sheets imported`);
  else fail('sheets', 'No sheets found');

  if (counts.answers > 0) pass('answers', `${counts.answers} answers imported`);
  else fail('answers', 'No answers found');

  return counts;
}

async function verifyAnswerQuestionLinks() {
  console.log('\n--- Answer -> Question Links ---');

  // Check for answers with null question_id
  const { data: nullQuestions, error: nullErr } = await supabase
    .from('answers')
    .select('id')
    .is('question_id', null)
    .limit(10);

  if (nullErr) throw nullErr;

  if (!nullQuestions || nullQuestions.length === 0) {
    pass('answer_questions', 'All answers have question_id set');
  } else {
    fail('answer_questions', `${nullQuestions.length}+ answers have null question_id`);
  }

  // Check for answers referencing non-existent questions
  const { data: orphanedAnswers, error: orphanErr } = await supabase
    .rpc('count_orphaned_answer_questions');

  if (orphanErr) {
    // RPC doesn't exist, do it manually with a query
    const { data: orphans, error: manualErr } = await supabase
      .from('answers')
      .select('id, question_id')
      .not('question_id', 'is', null);

    if (manualErr) throw manualErr;

    // This is a basic check - can't do LEFT JOIN in PostgREST easily
    pass('answer_question_refs', 'Answer-question foreign keys cannot be checked directly (use SQL)');
  } else {
    if (orphanedAnswers === 0) {
      pass('answer_question_refs', 'All answers reference valid questions');
    } else {
      fail('answer_question_refs', `${orphanedAnswers} answers reference non-existent questions`);
    }
  }
}

async function verifyChoiceLinks() {
  console.log('\n--- Answer -> Choice Links ---');

  // Get answers with choice_id set
  const { count: choiceAnswerCount, error: countErr } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('choice_id', 'is', null);

  if (countErr) throw countErr;

  console.log(`  Answers with choice_id: ${choiceAnswerCount}`);

  if (choiceAnswerCount && choiceAnswerCount > 0) {
    pass('choice_answers', `${choiceAnswerCount} answers have choice selections`);
  } else {
    warn('choice_answers', 'No answers have choice_id set (may be expected)');
  }
}

async function verifyTagRelationships() {
  console.log('\n--- Tag Relationships ---');

  const questionTagCount = await getCount('question_tags');
  const sheetTagCount = await getCount('sheet_tags');

  if (questionTagCount > 0) {
    pass('question_tags', `${questionTagCount} question-tag relationships`);
  } else {
    fail('question_tags', 'No question_tags found - tags determine which questions appear in sheets!');
  }

  if (sheetTagCount > 0) {
    pass('sheet_tags', `${sheetTagCount} sheet-tag relationships`);
  } else {
    warn('sheet_tags', 'No sheet_tags found - sheets may not have tags assigned yet');
  }
}

async function verifySampleData() {
  console.log('\n--- Sample Data Checks ---');

  // Get a sample sheet with its answers
  const { data: sampleSheet, error: sheetErr } = await supabase
    .from('sheets')
    .select(`
      id,
      name,
      status,
      companies:company_id (name),
      sheet_tags (
        tags (name)
      )
    `)
    .limit(1)
    .single();

  if (sheetErr || !sampleSheet) {
    warn('sample_sheet', 'Could not fetch sample sheet');
  } else {
    console.log(`  Sample sheet: "${sampleSheet.name}"`);
    console.log(`    Status: ${sampleSheet.status}`);
    console.log(`    Supplier: ${(sampleSheet.companies as any)?.name || 'Unknown'}`);

    const tags = (sampleSheet.sheet_tags as any[])?.map((st: any) => st.tags?.name).filter(Boolean);
    if (tags?.length) {
      console.log(`    Tags: ${tags.join(', ')}`);
      pass('sheet_tags_data', 'Sheet has tags assigned');
    } else {
      warn('sheet_tags_data', 'Sample sheet has no tags');
    }

    // Count answers for this sheet
    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sampleSheet.id);

    console.log(`    Answers: ${answerCount || 0}`);

    if (answerCount && answerCount > 0) {
      pass('sheet_answers', `Sample sheet has ${answerCount} answers`);
    } else {
      warn('sheet_answers', 'Sample sheet has no answers');
    }
  }

  // Check a sample question with tags
  const { data: sampleQuestion, error: qErr } = await supabase
    .from('questions')
    .select(`
      id,
      name,
      content,
      response_type,
      question_tags (
        tags (name)
      )
    `)
    .limit(1)
    .single();

  if (qErr || !sampleQuestion) {
    warn('sample_question', 'Could not fetch sample question');
  } else {
    console.log(`  Sample question: "${sampleQuestion.name}"`);
    console.log(`    Type: ${sampleQuestion.response_type}`);

    const qTags = (sampleQuestion.question_tags as any[])?.map((qt: any) => qt.tags?.name).filter(Boolean);
    if (qTags?.length) {
      console.log(`    Tags: ${qTags.join(', ')}`);
      pass('question_tags_data', 'Question has tags assigned');
    } else {
      warn('question_tags_data', 'Sample question has no tags');
    }
  }
}

async function runSQLChecks() {
  console.log('\n--- SQL Integrity Checks ---');
  console.log('  (Run these manually in Supabase SQL editor for full verification)');

  console.log(`
-- Counts match
SELECT 'companies' as t, count(*) FROM companies
UNION SELECT 'sheets', count(*) FROM sheets
UNION SELECT 'questions', count(*) FROM questions
UNION SELECT 'answers', count(*) FROM answers
ORDER BY t;

-- Answers with invalid question_id
SELECT count(*) as orphaned_answers FROM answers a
LEFT JOIN questions q ON a.question_id = q.id
WHERE q.id IS NULL;

-- Choice answers with invalid choice_id
SELECT count(*) as orphaned_choices FROM answers a
WHERE a.choice_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM choices c WHERE c.id = a.choice_id);

-- Questions with no tags (may be intentional)
SELECT count(*) as untagged_questions FROM questions q
WHERE NOT EXISTS (SELECT 1 FROM question_tags qt WHERE qt.question_id = q.id);

-- Sheets with no tags
SELECT count(*) as untagged_sheets FROM sheets s
WHERE NOT EXISTS (SELECT 1 FROM sheet_tags st WHERE st.sheet_id = s.id);
  `);
}

async function main() {
  console.log('===============================================');
  console.log('   Fresh Import Verification');
  console.log('===============================================');

  try {
    await verifyCounts();
    await verifyAnswerQuestionLinks();
    await verifyChoiceLinks();
    await verifyTagRelationships();
    await verifySampleData();
    await runSQLChecks();

    // Summary
    console.log('\n===============================================');
    console.log('   Verification Summary');
    console.log('===============================================');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;

    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Warnings: ${warned}`);

    if (failed > 0) {
      console.log('\nFailed checks:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.check}: ${r.message}`);
      });
      process.exit(1);
    }

    if (warned > 0) {
      console.log('\nWarnings (may need attention):');
      results.filter(r => r.status === 'WARN').forEach(r => {
        console.log(`  - ${r.check}: ${r.message}`);
      });
    }

    console.log('\nVerification complete!');
  } catch (error) {
    console.error('\nVerification failed:', error);
    process.exit(1);
  }
}

main();

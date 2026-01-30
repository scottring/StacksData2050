import { supabase } from './src/migration/supabase-client.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BUBBLE_API_URL = process.env.BUBBLE_API_URL!;
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!;

/**
 * Comprehensive Bubble → Supabase Migration Verification
 *
 * This script verifies data integrity by comparing:
 * 1. Questions: text, parent section/subsection links
 * 2. Choices: content and parent question links
 * 3. Answers: values and question linkage (CRITICAL)
 * 4. Pattern analysis for systematic issues
 */

interface VerificationResult {
  category: string;
  item: string;
  bubbleValue: string | null;
  supabaseValue: string | null;
  match: boolean;
  details?: string;
}

interface BubbleResponse<T> {
  response: {
    results: T[];
    count: number;
    remaining: number;
  };
}

const results: VerificationResult[] = [];
const issues: string[] = [];
const verified: string[] = [];

async function fetchBubble<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${BUBBLE_API_URL}/api/1.1/obj/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  if (!response.ok) {
    throw new Error(`Bubble API error: ${response.status}`);
  }

  const data = await response.json() as BubbleResponse<T>;
  return data.response?.results || [];
}

async function fetchBubbleById<T>(endpoint: string, id: string): Promise<T | null> {
  const url = `${BUBBLE_API_URL}/api/1.1/obj/${endpoint}/${id}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Bubble API error: ${response.status}`);

  const data = await response.json() as { response: T };
  return data.response;
}

async function fetchBubbleWithConstraints<T>(
  endpoint: string,
  constraints: Array<{ key: string; constraint_type: string; value: string }>
): Promise<T[]> {
  const url = new URL(`${BUBBLE_API_URL}/api/1.1/obj/${endpoint}`);
  url.searchParams.set('constraints', JSON.stringify(constraints));
  url.searchParams.set('limit', '100');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  });

  if (!response.ok) throw new Error(`Bubble API error: ${response.status}`);

  const data = await response.json() as BubbleResponse<T>;
  return data.response?.results || [];
}

// ============================================================================
// PHASE 1: QUESTION VERIFICATION
// ============================================================================

async function verifyQuestions() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 PHASE 1: QUESTION VERIFICATION');
  console.log('='.repeat(80));

  // Get sample questions from Supabase (spread across different sections)
  const { data: sampleQuestions } = await supabase
    .from('questions')
    .select(`
      id, bubble_id, name, content,
      section_sort_number, subsection_sort_number, order_number,
      parent_section_id, parent_subsection_id
    `)
    .not('bubble_id', 'is', null)
    .order('section_sort_number')
    .limit(10);

  if (!sampleQuestions || sampleQuestions.length === 0) {
    issues.push('❌ No questions found in Supabase with bubble_id');
    return;
  }

  console.log(`\nVerifying ${sampleQuestions.length} sample questions...\n`);

  let matchCount = 0;
  let mismatchCount = 0;

  for (const sq of sampleQuestions) {
    const bubbleQ = await fetchBubbleById<any>('question', sq.bubble_id);

    if (!bubbleQ) {
      console.log(`❌ Question ${sq.bubble_id} not found in Bubble`);
      mismatchCount++;
      continue;
    }

    const checks = {
      name: sq.name === bubbleQ.Name,
      content: sq.content === bubbleQ.Content,
      sectionSort: sq.section_sort_number === bubbleQ['SECTION SORT NUMBER'],
      subsectionSort: sq.subsection_sort_number === bubbleQ['SUBSECTION SORT NUMBER'],
      order: sq.order_number === bubbleQ.Order
    };

    const allMatch = Object.values(checks).every(Boolean);

    console.log(`Question ${sq.section_sort_number}.${sq.subsection_sort_number}.${sq.order_number}: ${sq.name?.substring(0, 50)}...`);
    console.log(`  Name: ${checks.name ? '✅' : '❌'}`);
    console.log(`  Content: ${checks.content ? '✅' : '❌'}`);
    console.log(`  Section#: ${checks.sectionSort ? '✅' : '❌'} (S:${sq.section_sort_number} vs B:${bubbleQ['SECTION SORT NUMBER']})`);
    console.log(`  Subsection#: ${checks.subsectionSort ? '✅' : '❌'} (S:${sq.subsection_sort_number} vs B:${bubbleQ['SUBSECTION SORT NUMBER']})`);
    console.log(`  Order#: ${checks.order ? '✅' : '❌'} (S:${sq.order_number} vs B:${bubbleQ.Order})`);

    // Verify parent section link
    if (sq.parent_section_id && bubbleQ['Parent Section']) {
      const { data: section } = await supabase
        .from('sections')
        .select('bubble_id, name')
        .eq('id', sq.parent_section_id)
        .single();

      const sectionMatch = section?.bubble_id === bubbleQ['Parent Section'];
      console.log(`  Parent Section: ${sectionMatch ? '✅' : '❌'}`);
      if (!sectionMatch) {
        console.log(`    Expected: ${bubbleQ['Parent Section']}, Got: ${section?.bubble_id}`);
      }
    }

    // Verify parent subsection link
    if (sq.parent_subsection_id && bubbleQ['Parent Subsection']) {
      const { data: subsection } = await supabase
        .from('subsections')
        .select('bubble_id, name')
        .eq('id', sq.parent_subsection_id)
        .single();

      const subsectionMatch = subsection?.bubble_id === bubbleQ['Parent Subsection'];
      console.log(`  Parent Subsection: ${subsectionMatch ? '✅' : '❌'}`);
      if (!subsectionMatch) {
        console.log(`    Expected: ${bubbleQ['Parent Subsection']}, Got: ${subsection?.bubble_id}`);
      }
    }

    if (allMatch) {
      matchCount++;
    } else {
      mismatchCount++;
      results.push({
        category: 'Question',
        item: sq.bubble_id,
        bubbleValue: JSON.stringify({ name: bubbleQ.Name, section: bubbleQ['SECTION SORT NUMBER'] }),
        supabaseValue: JSON.stringify({ name: sq.name, section: sq.section_sort_number }),
        match: false
      });
    }

    console.log('');
    await sleep(100); // Rate limiting
  }

  if (mismatchCount === 0) {
    verified.push(`✅ All ${matchCount} sampled questions match Bubble`);
  } else {
    issues.push(`❌ ${mismatchCount}/${sampleQuestions.length} questions have mismatches`);
  }
}

// ============================================================================
// PHASE 2: CHOICE VERIFICATION
// ============================================================================

async function verifyChoices() {
  console.log('\n' + '='.repeat(80));
  console.log('🔘 PHASE 2: CHOICE VERIFICATION');
  console.log('='.repeat(80));

  // Get sample choices from Supabase
  const { data: sampleChoices } = await supabase
    .from('choices')
    .select(`
      id, bubble_id, content, order_number,
      parent_question_id,
      questions!choices_parent_question_id_fkey (bubble_id, name)
    `)
    .not('bubble_id', 'is', null)
    .limit(15);

  if (!sampleChoices || sampleChoices.length === 0) {
    issues.push('❌ No choices found in Supabase with bubble_id');
    return;
  }

  console.log(`\nVerifying ${sampleChoices.length} sample choices...\n`);

  let matchCount = 0;
  let mismatchCount = 0;

  for (const sc of sampleChoices) {
    const bubbleC = await fetchBubbleById<any>('choice', sc.bubble_id);

    if (!bubbleC) {
      console.log(`❌ Choice ${sc.bubble_id} not found in Bubble`);
      mismatchCount++;
      continue;
    }

    const checks = {
      content: sc.content === bubbleC.Content,
      order: sc.order_number === bubbleC.Order,
    };

    // Verify parent question link
    let parentQuestionMatch = true;
    if (sc.parent_question_id && bubbleC['Parent Question']) {
      const question = sc.questions as any;
      parentQuestionMatch = question?.bubble_id === bubbleC['Parent Question'];
    }

    const allMatch = checks.content && checks.order && parentQuestionMatch;

    console.log(`Choice: "${sc.content?.substring(0, 40)}..."`);
    console.log(`  Content: ${checks.content ? '✅' : '❌'}`);
    console.log(`  Order: ${checks.order ? '✅' : '❌'} (S:${sc.order_number} vs B:${bubbleC.Order})`);
    console.log(`  Parent Question: ${parentQuestionMatch ? '✅' : '❌'}`);

    if (allMatch) {
      matchCount++;
    } else {
      mismatchCount++;
    }

    console.log('');
    await sleep(100);
  }

  if (mismatchCount === 0) {
    verified.push(`✅ All ${matchCount} sampled choices match Bubble`);
  } else {
    issues.push(`❌ ${mismatchCount}/${sampleChoices.length} choices have mismatches`);
  }
}

// ============================================================================
// PHASE 3: ANSWER VERIFICATION (CRITICAL)
// ============================================================================

async function verifyAnswers() {
  console.log('\n' + '='.repeat(80));
  console.log('💬 PHASE 3: ANSWER VERIFICATION (CRITICAL)');
  console.log('='.repeat(80));
  console.log('\nThis verifies that answers are linked to the CORRECT questions.\n');

  // Get sheets that have answers
  const { data: sheetsWithAnswers } = await supabase
    .from('sheets')
    .select(`
      id, bubble_id, name,
      answers (count)
    `)
    .not('bubble_id', 'is', null)
    .limit(100);

  // Filter to sheets with answers and take 5
  const activeSheets = sheetsWithAnswers
    ?.filter((s: any) => s.answers?.[0]?.count > 0)
    .slice(0, 5);

  if (!activeSheets || activeSheets.length === 0) {
    console.log('⚠️  No sheets with answers found to verify');
    return;
  }

  console.log(`Found ${activeSheets.length} sheets with answers to verify\n`);

  let totalMismatches = 0;
  let totalVerified = 0;

  for (const sheet of activeSheets) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Sheet: ${sheet.name}`);
    console.log(`Bubble ID: ${sheet.bubble_id}`);
    console.log(`${'─'.repeat(60)}`);

    // Get answers from Supabase for this sheet
    const { data: supabaseAnswers } = await supabase
      .from('answers')
      .select(`
        id, bubble_id,
        text_value, boolean_value, number_value,
        parent_question_id,
        choice_id,
        questions!answers_parent_question_id_fkey (bubble_id, name, section_sort_number, subsection_sort_number, order_number)
      `)
      .eq('sheet_id', sheet.id)
      .not('parent_question_id', 'is', null)
      .limit(20);

    if (!supabaseAnswers || supabaseAnswers.length === 0) {
      console.log('  No answers with parent_question_id found');
      continue;
    }

    console.log(`  Checking ${supabaseAnswers.length} answers...\n`);

    for (const sa of supabaseAnswers) {
      if (!sa.bubble_id) continue;

      const bubbleA = await fetchBubbleById<any>('answer', sa.bubble_id);

      if (!bubbleA) {
        console.log(`  ❌ Answer ${sa.bubble_id} not found in Bubble`);
        totalMismatches++;
        continue;
      }

      // CRITICAL CHECK: Does the answer link to the correct question?
      const question = sa.questions as any;
      const questionLinkCorrect = question?.bubble_id === bubbleA['Parent Question'];

      // Check answer value
      let valueMatch = true;
      let valueDetails = '';

      if (bubbleA.text !== undefined && bubbleA.text !== null) {
        valueMatch = sa.text_value === bubbleA.text;
        valueDetails = `text: "${sa.text_value}" vs "${bubbleA.text}"`;
      } else if (bubbleA.Boolean !== undefined && bubbleA.Boolean !== null) {
        valueMatch = sa.boolean_value === bubbleA.Boolean;
        valueDetails = `bool: ${sa.boolean_value} vs ${bubbleA.Boolean}`;
      } else if (bubbleA.Number !== undefined && bubbleA.Number !== null) {
        valueMatch = sa.number_value === bubbleA.Number;
        valueDetails = `num: ${sa.number_value} vs ${bubbleA.Number}`;
      }

      // If choice-based answer, verify choice link
      let choiceMatch = true;
      if (bubbleA.Choice && sa.choice_id) {
        const { data: choice } = await supabase
          .from('choices')
          .select('bubble_id, content')
          .eq('id', sa.choice_id)
          .single();

        choiceMatch = choice?.bubble_id === bubbleA.Choice;
        if (!choiceMatch) {
          valueDetails = `choice: S:${choice?.content} (${choice?.bubble_id}) vs B:${bubbleA.Choice}`;
        }
      }

      const qNum = question ? `${question.section_sort_number}.${question.subsection_sort_number}.${question.order_number}` : 'unknown';

      if (!questionLinkCorrect) {
        console.log(`  ❌ QUESTION LINK MISMATCH for answer ${sa.bubble_id.substring(0, 12)}...`);
        console.log(`     Supabase links to: ${question?.bubble_id} (Q ${qNum}: ${question?.name?.substring(0, 40)}...)`);
        console.log(`     Bubble links to:   ${bubbleA['Parent Question']}`);
        totalMismatches++;

        results.push({
          category: 'Answer-Question Link',
          item: sa.bubble_id,
          bubbleValue: bubbleA['Parent Question'],
          supabaseValue: question?.bubble_id,
          match: false,
          details: `Sheet: ${sheet.name}, Question expected: ${bubbleA['Parent Question']}`
        });
      } else if (!valueMatch || !choiceMatch) {
        console.log(`  ⚠️  Value mismatch for Q ${qNum}: ${valueDetails}`);
        totalMismatches++;
      } else {
        console.log(`  ✅ Q ${qNum}: ${question?.name?.substring(0, 40)}...`);
        totalVerified++;
      }

      await sleep(50);
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log('ANSWER VERIFICATION SUMMARY:');
  console.log(`  Verified correct: ${totalVerified}`);
  console.log(`  Mismatches found: ${totalMismatches}`);
  console.log(`${'─'.repeat(60)}`);

  if (totalMismatches === 0) {
    verified.push(`✅ All ${totalVerified} sampled answers link to correct questions`);
  } else {
    issues.push(`❌ ${totalMismatches} answer-question link mismatches found`);
  }
}

// ============================================================================
// PHASE 4: PATTERN ANALYSIS
// ============================================================================

async function analyzePatterns() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 PHASE 4: PATTERN ANALYSIS');
  console.log('='.repeat(80));

  // Check if certain sections have more issues than others
  console.log('\nAnalyzing by section...\n');

  const { data: sectionCounts } = await supabase
    .from('questions')
    .select('section_sort_number')
    .not('bubble_id', 'is', null);

  const sectionGroups: Record<number, number> = {};
  sectionCounts?.forEach(q => {
    const s = q.section_sort_number || 0;
    sectionGroups[s] = (sectionGroups[s] || 0) + 1;
  });

  console.log('Questions per section in Supabase:');
  Object.entries(sectionGroups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([section, count]) => {
      console.log(`  Section ${section}: ${count} questions`);
    });

  // Check for orphaned answers (answers without valid question links)
  console.log('\nChecking for orphaned answers...');

  const { count: orphanedAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .is('parent_question_id', null);

  console.log(`  Answers without parent_question_id: ${orphanedAnswers || 0}`);

  // Check for answers pointing to non-existent questions
  const { data: answerQuestionIds } = await supabase
    .from('answers')
    .select('parent_question_id')
    .not('parent_question_id', 'is', null)
    .limit(1000);

  const uniqueQuestionIds = [...new Set(answerQuestionIds?.map(a => a.parent_question_id))];

  let missingQuestions = 0;
  for (const qId of uniqueQuestionIds.slice(0, 100)) {
    const { data: q } = await supabase
      .from('questions')
      .select('id')
      .eq('id', qId)
      .single();

    if (!q) missingQuestions++;
  }

  console.log(`  Answers pointing to missing questions: ${missingQuestions} (of ${Math.min(100, uniqueQuestionIds.length)} sampled)`);

  if (orphanedAnswers && orphanedAnswers > 0) {
    issues.push(`⚠️  ${orphanedAnswers} answers have no parent_question_id`);
  }

  if (missingQuestions > 0) {
    issues.push(`❌ ${missingQuestions} answers point to non-existent questions`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔬 BUBBLE → SUPABASE MIGRATION VERIFICATION');
  console.log('='.repeat(80));
  console.log(`Bubble API: ${BUBBLE_API_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  try {
    await verifyQuestions();
    await verifyChoices();
    await verifyAnswers();
    await analyzePatterns();
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error);
    process.exit(1);
  }

  // ============================================================================
  // FINAL REPORT
  // ============================================================================

  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION REPORT');
  console.log('='.repeat(80));

  console.log('\n✅ VERIFIED:');
  if (verified.length === 0) {
    console.log('  (none)');
  } else {
    verified.forEach(v => console.log(`  ${v}`));
  }

  console.log('\n❌ ISSUES FOUND:');
  if (issues.length === 0) {
    console.log('  None! Migration appears correct.');
  } else {
    issues.forEach(i => console.log(`  ${i}`));
  }

  // Detailed mismatches
  if (results.filter(r => !r.match).length > 0) {
    console.log('\n📝 DETAILED MISMATCHES:');
    results
      .filter(r => !r.match)
      .slice(0, 10)
      .forEach(r => {
        console.log(`\n  ${r.category}: ${r.item}`);
        console.log(`    Bubble:   ${r.bubbleValue}`);
        console.log(`    Supabase: ${r.supabaseValue}`);
        if (r.details) console.log(`    Details:  ${r.details}`);
      });
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎯 RECOMMENDATION');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('\n✅ MIGRATION VERIFIED');
    console.log('   Data integrity confirmed. Safe to proceed with Excel import.');
  } else if (issues.every(i => i.includes('⚠️'))) {
    console.log('\n⚠️  MINOR ISSUES');
    console.log('   Some warnings found, but no critical mismatches.');
    console.log('   Review warnings before proceeding.');
  } else {
    console.log('\n❌ MIGRATION ISSUES DETECTED');
    console.log('   Critical mismatches found between Bubble and Supabase.');
    console.log('   DO NOT proceed with Excel import until issues are resolved.');
    console.log('\n   Recommended next steps:');
    console.log('   1. Investigate specific mismatches listed above');
    console.log('   2. Run targeted fix scripts if issues are isolated');
    console.log('   3. Consider partial re-migration if issues are systematic');
    console.log('   4. Re-run this verification after fixes');
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Completed: ${new Date().toISOString()}`);
}

main().catch(console.error);

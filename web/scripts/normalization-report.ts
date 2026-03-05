/**
 * Phase 2: Normalization Report
 *
 * Generates a detailed report of the CDR normalization results.
 * Run after normalize-legacy-questions.ts.
 *
 * Usage: cd stacks/web && npx tsx scripts/normalization-report.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface MappingRow {
  id: string;
  legacy_question_id: string;
  canonical_parameter_id: string | null;
  confidence: number;
  reasoning: string;
  status: string;
  question: {
    content: string | null;
    name: string | null;
    section_sort_number: number | null;
    subsection_sort_number: number | null;
    order_number: number | null;
  } | null;
  parameter: {
    code: string;
    name: string;
    section: string;
  } | null;
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.substring(0, len - 3) + '...';
}

function questionNumber(q: MappingRow['question']): string {
  if (!q) return '?';
  if (q.section_sort_number && q.subsection_sort_number && q.order_number) {
    return `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`;
  }
  return '?';
}

function questionText(q: MappingRow['question']): string {
  if (!q) return '(no question data)';
  return q.content || q.name || '(empty)';
}

async function report() {
  console.log('=== CDR Normalization Report ===\n');

  // Verify existing tables unchanged
  console.log('--- Table Integrity Check ---');
  const { count: qCount } = await supabase.from('questions').select('*', { count: 'exact', head: true });
  const { count: aCount } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  const { count: sCount } = await supabase.from('sheets').select('*', { count: 'exact', head: true });
  console.log(`  questions: ${qCount} rows ${qCount === 201 ? '[OK]' : '[UNEXPECTED]'}`);
  console.log(`  answers: ${aCount} rows ${aCount === 84954 ? '[OK]' : '[UNEXPECTED]'}`);
  console.log(`  sheets: ${sCount} rows ${sCount === 775 ? '[OK]' : '[UNEXPECTED]'}`);

  // Fetch all mappings with joins
  const { data: rawMappings, error } = await supabase
    .from('normalization_mappings')
    .select(`
      id,
      legacy_question_id,
      canonical_parameter_id,
      confidence,
      reasoning,
      status,
      question:legacy_question_id(content, name, section_sort_number, subsection_sort_number, order_number),
      parameter:canonical_parameter_id(code, name, section)
    `)
    .order('confidence', { ascending: false });

  if (error) {
    console.error('Failed to fetch mappings:', error.message);
    process.exit(1);
  }

  const mappings = (rawMappings || []) as unknown as MappingRow[];

  if (mappings.length === 0) {
    console.log('\nNo mappings found. Run normalize-legacy-questions.ts first.');
    process.exit(0);
  }

  // Stats
  const total = mappings.length;
  const matched = mappings.filter(m => m.canonical_parameter_id !== null);
  const high = matched.filter(m => m.confidence > 0.85);
  const medium = matched.filter(m => m.confidence >= 0.5 && m.confidence <= 0.85);
  const low = matched.filter(m => m.confidence > 0 && m.confidence < 0.5);
  const noMatch = mappings.filter(m => m.canonical_parameter_id === null);

  console.log('\n--- Summary Statistics ---');
  console.log(`  Total legacy questions:        ${total}`);
  console.log(`  Matched (confidence > 0):      ${matched.length} (${(matched.length / total * 100).toFixed(0)}%)`);
  console.log(`  High confidence (> 0.85):      ${high.length} (${(high.length / total * 100).toFixed(0)}%)`);
  console.log(`  Medium confidence (0.5-0.85):  ${medium.length} (${(medium.length / total * 100).toFixed(0)}%)`);
  console.log(`  Low confidence (< 0.5):        ${low.length} (${(low.length / total * 100).toFixed(0)}%)`);
  console.log(`  No match:                      ${noMatch.length} (${(noMatch.length / total * 100).toFixed(0)}%)`);

  // CDR go/no-go
  const goNoGo = high.length / total;
  console.log(`\n  CDR Go/No-Go: ${(goNoGo * 100).toFixed(1)}% high-confidence (threshold: 70%)`);
  if (goNoGo >= 0.7) {
    console.log('  >>> CDR VALIDATED <<<');
  } else {
    console.log('  >>> Below threshold — review needed <<<');
  }

  // Canonical parameter coverage
  const { data: allParams } = await supabase
    .from('canonical_parameters')
    .select('id, code, name, section')
    .order('sort_order');

  const matchedParamIds = new Set(
    matched
      .filter(m => m.confidence > 0.5)
      .map(m => m.canonical_parameter_id)
  );

  const unmatchedParams = (allParams || []).filter(p => !matchedParamIds.has(p.id));

  console.log(`\n--- Canonical Parameter Coverage ---`);
  console.log(`  Parameters with legacy match: ${matchedParamIds.size} of ${allParams?.length || 80}`);
  if (unmatchedParams.length > 0) {
    console.log(`  Parameters with NO legacy match (new in HQ 2.1):`);
    for (const p of unmatchedParams) {
      console.log(`    ${p.code}  ${p.section.padEnd(25)} ${truncate(p.name, 70)}`);
    }
  }

  // Full mapping table
  console.log('\n--- Full Mapping Table ---');
  console.log(
    '  ' +
    'Num'.padEnd(8) +
    'Legacy Question'.padEnd(55) +
    'Param'.padEnd(8) +
    'Canonical Name'.padEnd(45) +
    'Conf'.padEnd(6) +
    'Reasoning'
  );
  console.log('  ' + '-'.repeat(170));

  // Sort by question number for readability
  const sorted = [...mappings].sort((a, b) => {
    const aNum = questionNumber(a.question);
    const bNum = questionNumber(b.question);
    const aParts = aNum.split('.').map(Number);
    const bParts = bNum.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const diff = (aParts[i] || 0) - (bParts[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  for (const m of sorted) {
    const num = questionNumber(m.question);
    const legacy = truncate(questionText(m.question), 52);
    const paramCode = m.parameter?.code || '—';
    const paramName = m.parameter ? truncate(m.parameter.name, 42) : '(no match)';
    const conf = m.canonical_parameter_id ? m.confidence.toFixed(2) : '—';
    const reason = truncate(m.reasoning, 60);

    console.log(
      '  ' +
      num.padEnd(8) +
      legacy.padEnd(55) +
      paramCode.padEnd(8) +
      paramName.padEnd(45) +
      String(conf).padEnd(6) +
      reason
    );
  }

  // Low confidence items (full detail)
  if (low.length > 0) {
    console.log(`\n--- Low Confidence Items (< 0.5) — Full Detail ---`);
    for (const m of low) {
      console.log(`\n  ${questionNumber(m.question)}: ${questionText(m.question)}`);
      console.log(`    → ${m.parameter?.code || '?'}: ${m.parameter?.name || '?'}`);
      console.log(`    Confidence: ${m.confidence.toFixed(2)}`);
      console.log(`    Reasoning: ${m.reasoning}`);
    }
  }

  // No match items (full detail)
  if (noMatch.length > 0) {
    console.log(`\n--- No Match Items — Full Detail ---`);
    for (const m of noMatch) {
      console.log(`\n  ${questionNumber(m.question)}: ${questionText(m.question)}`);
      console.log(`    Reasoning: ${m.reasoning}`);
    }
  }

  // Average confidence
  if (matched.length > 0) {
    const avgConf = matched.reduce((sum, m) => sum + m.confidence, 0) / matched.length;
    console.log(`\n--- Confidence Distribution ---`);
    console.log(`  Average confidence (matched only): ${avgConf.toFixed(3)}`);
    console.log(`  Median confidence: ${matched[Math.floor(matched.length / 2)].confidence.toFixed(3)}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('REPORT COMPLETE');
  console.log('='.repeat(60));
}

report().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

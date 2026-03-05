/**
 * Phase 2: CDR Normalization
 *
 * Maps 201 legacy Bubble-migrated questions to 80 canonical parameters
 * using Claude Sonnet for AI-powered semantic matching.
 *
 * Usage: cd stacks/web && npx tsx scripts/normalize-legacy-questions.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const MODEL = 'claude-sonnet-4-20250514';

interface LegacyQuestion {
  id: string;
  content: string | null;
  name: string | null;
  section_sort_number: number | null;
  subsection_sort_number: number | null;
  order_number: number | null;
  section_name: string | null;
  subsection_name: string | null;
}

interface CanonicalParameter {
  id: string;
  code: string;
  section: string;
  subsection: string | null;
  name: string;
  answer_type_code: string;
  answer_pattern: string;
}

interface MappingResult {
  legacy_question_id: string;
  canonical_parameter_id: string | null;
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a regulatory compliance expert specializing in paper and packaging industry questionnaires. You are mapping legacy questions from a Bubble.io platform to canonical parameters from the HQ 2.1 industry-standard questionnaire.

For each legacy question, find the best matching canonical parameter. Consider:
- The underlying regulatory requirement, not just surface wording
- Section context (Ecolabels, Biocides, Food Contact, PIDSL, Additional Requirements)
- Jurisdiction (EU, German BfR, US FDA, etc.)
- Answer pattern (simple dropdown vs. dropdown + detail table)
- Some legacy questions may be section headers, metadata, or static text — these won't have a canonical match

Return a JSON array. For each legacy question:
- If there's a confident match: canonical_parameter_id (use the exact UUID), confidence (0.0-1.0), reasoning
- If no match exists: canonical_parameter_id = null, confidence = 0, reasoning explaining why (e.g., "This is a section header, not a question" or "This topic is not covered in HQ 2.1")

IMPORTANT:
- Use the canonical parameter's "id" field (UUID), NOT the "code" field
- Every legacy question must appear in the output exactly once
- Confidence should reflect genuine semantic similarity, not just keyword overlap
- Be specific in reasoning — reference the regulation or topic being matched`;

async function fetchLegacyQuestions(): Promise<LegacyQuestion[]> {
  // Fetch questions, sections, and subsections separately then join in-memory
  // questions → subsection_id → subsections → section_id → sections
  const [qRes, secRes, subRes] = await Promise.all([
    supabase
      .from('questions')
      .select('id, content, name, section_sort_number, subsection_sort_number, order_number, subsection_id')
      .order('section_sort_number')
      .order('subsection_sort_number')
      .order('order_number'),
    supabase.from('sections').select('id, name'),
    supabase.from('subsections').select('id, name, section_id'),
  ]);

  if (qRes.error) throw new Error(`Failed to fetch questions: ${qRes.error.message}`);
  if (!qRes.data) throw new Error('No questions returned');

  const sectionMap = new Map((secRes.data || []).map((s: any) => [s.id, s.name]));
  const subsectionMap = new Map((subRes.data || []).map((s: any) => [s.id, { name: s.name, section_id: s.section_id }]));

  return qRes.data.map((q: any) => {
    const sub = subsectionMap.get(q.subsection_id);
    return {
      id: q.id,
      content: q.content,
      name: q.name,
      section_sort_number: q.section_sort_number,
      subsection_sort_number: q.subsection_sort_number,
      order_number: q.order_number,
      section_name: sub ? sectionMap.get(sub.section_id) || null : null,
      subsection_name: sub?.name || null,
    };
  });
}

async function fetchCanonicalParameters(): Promise<CanonicalParameter[]> {
  const { data, error } = await supabase
    .from('canonical_parameters')
    .select('id, code, section, subsection, name, answer_type_code, answer_pattern')
    .order('sort_order');

  if (error) throw new Error(`Failed to fetch parameters: ${error.message}`);
  if (!data) throw new Error('No parameters returned');
  return data;
}

function formatLegacyForPrompt(questions: LegacyQuestion[]) {
  return questions.map(q => ({
    id: q.id,
    text: q.content || q.name || '(no text)',
    section: q.section_name || '(unknown)',
    subsection: q.subsection_name || '(unknown)',
    number: q.section_sort_number && q.subsection_sort_number && q.order_number
      ? `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
      : '(unnumbered)',
  }));
}

function formatCanonicalForPrompt(params: CanonicalParameter[]) {
  return params.map(p => ({
    id: p.id,
    code: p.code,
    section: p.section,
    subsection: p.subsection,
    name: p.name,
    answer_type_code: p.answer_type_code,
    answer_pattern: p.answer_pattern,
  }));
}

async function callClaude(
  legacyQuestions: LegacyQuestion[],
  canonicalParams: CanonicalParameter[]
): Promise<MappingResult[]> {
  const input = {
    legacy_questions: formatLegacyForPrompt(legacyQuestions),
    canonical_parameters: formatCanonicalForPrompt(canonicalParams),
  };

  const inputJson = JSON.stringify(input, null, 2);
  console.log(`  Input size: ${(inputJson.length / 1024).toFixed(1)} KB`);
  console.log(`  Legacy questions: ${legacyQuestions.length}`);
  console.log(`  Canonical parameters: ${canonicalParams.length}`);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here are the legacy questions and canonical parameters. Map each legacy question to its best canonical parameter match.\n\n${inputJson}\n\nReturn ONLY a JSON array of mapping objects. No markdown, no explanation outside the JSON.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  // Extract JSON from response (handle possible markdown wrapping)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Claude response did not contain a JSON array:\n' + text.slice(0, 500));
  }

  const results: MappingResult[] = JSON.parse(jsonMatch[0]);

  console.log(`  Claude returned ${results.length} mappings`);
  console.log(`  Input tokens: ${response.usage.input_tokens}, Output tokens: ${response.usage.output_tokens}`);

  return results;
}

async function storeMappings(mappings: MappingResult[]): Promise<void> {
  // Clear existing mappings (idempotent re-run)
  const { error: delError } = await supabase
    .from('normalization_mappings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (delError) throw new Error(`Failed to clear existing mappings: ${delError.message}`);

  // Insert in batches
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = mappings.slice(i, i + BATCH_SIZE).map(m => ({
      legacy_question_id: m.legacy_question_id,
      canonical_parameter_id: m.canonical_parameter_id || null,
      confidence: m.confidence,
      reasoning: m.reasoning,
      status: 'pending',
    }));

    const { error } = await supabase
      .from('normalization_mappings')
      .insert(batch);

    if (error) throw new Error(`Failed to insert batch at offset ${i}: ${error.message}`);
    inserted += batch.length;
  }

  console.log(`  Stored ${inserted} mappings`);
}

async function normalize() {
  console.log('=== Phase 2: CDR Normalization ===\n');

  // 1. Snapshot existing tables
  console.log('--- Before snapshot ---');
  const { count: qCount } = await supabase.from('questions').select('*', { count: 'exact', head: true });
  const { count: aCount } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  const { count: sCount } = await supabase.from('sheets').select('*', { count: 'exact', head: true });
  console.log(`  questions: ${qCount} rows`);
  console.log(`  answers: ${aCount} rows`);
  console.log(`  sheets: ${sCount} rows`);

  // 2. Fetch data
  console.log('\n--- Fetching data ---');
  const legacyQuestions = await fetchLegacyQuestions();
  console.log(`  Loaded ${legacyQuestions.length} legacy questions`);

  const canonicalParams = await fetchCanonicalParameters();
  console.log(`  Loaded ${canonicalParams.length} canonical parameters`);

  // 3. Call Claude for normalization
  console.log('\n--- Calling Claude for normalization ---');
  const startTime = Date.now();
  const mappings = await callClaude(legacyQuestions, canonicalParams);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Completed in ${elapsed}s`);

  // Validate: every legacy question should have a mapping
  const mappedIds = new Set(mappings.map(m => m.legacy_question_id));
  const missing = legacyQuestions.filter(q => !mappedIds.has(q.id));
  if (missing.length > 0) {
    console.log(`\n  WARNING: ${missing.length} legacy questions not in Claude response. Adding as no-match.`);
    for (const q of missing) {
      mappings.push({
        legacy_question_id: q.id,
        canonical_parameter_id: null,
        confidence: 0,
        reasoning: 'Not included in AI normalization response',
      });
    }
  }

  // Validate: canonical_parameter_ids should reference real parameters
  const paramIds = new Set(canonicalParams.map(p => p.id));
  for (const m of mappings) {
    if (m.canonical_parameter_id && !paramIds.has(m.canonical_parameter_id)) {
      console.log(`  WARNING: Mapping references unknown parameter ${m.canonical_parameter_id}, setting to null`);
      m.canonical_parameter_id = null;
      m.confidence = 0;
      m.reasoning = `Original AI match referenced invalid parameter ID. ${m.reasoning}`;
    }
  }

  // 4. Store results
  console.log('\n--- Storing mappings ---');
  await storeMappings(mappings);

  // 5. Verify existing tables unchanged
  console.log('\n--- After snapshot ---');
  const { count: qCount2 } = await supabase.from('questions').select('*', { count: 'exact', head: true });
  const { count: aCount2 } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  const { count: sCount2 } = await supabase.from('sheets').select('*', { count: 'exact', head: true });
  console.log(`  questions: ${qCount2} rows ${qCount2 === qCount ? '[UNCHANGED]' : '[CHANGED!]'}`);
  console.log(`  answers: ${aCount2} rows ${aCount2 === aCount ? '[UNCHANGED]' : '[CHANGED!]'}`);
  console.log(`  sheets: ${sCount2} rows ${sCount2 === sCount ? '[UNCHANGED]' : '[CHANGED!]'}`);

  // 6. Quick stats
  console.log('\n--- Quick Stats ---');
  const matched = mappings.filter(m => m.canonical_parameter_id !== null);
  const high = matched.filter(m => m.confidence > 0.85);
  const medium = matched.filter(m => m.confidence >= 0.5 && m.confidence <= 0.85);
  const low = matched.filter(m => m.confidence > 0 && m.confidence < 0.5);
  const noMatch = mappings.filter(m => m.canonical_parameter_id === null);

  console.log(`  Total: ${mappings.length}`);
  console.log(`  Matched: ${matched.length} (${(matched.length / mappings.length * 100).toFixed(0)}%)`);
  console.log(`  High confidence (>0.85): ${high.length}`);
  console.log(`  Medium confidence (0.5-0.85): ${medium.length}`);
  console.log(`  Low confidence (<0.5): ${low.length}`);
  console.log(`  No match: ${noMatch.length}`);

  const goNoGo = high.length / mappings.length;
  console.log(`\n  CDR Go/No-Go: ${(goNoGo * 100).toFixed(1)}% high-confidence (threshold: 70%)`);
  if (goNoGo >= 0.7) {
    console.log('  >>> CDR VALIDATED <<<');
  } else {
    console.log('  >>> Below threshold — review needed <<<');
  }

  console.log('\nDone. Run normalization-report.ts for full details.');
}

normalize().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

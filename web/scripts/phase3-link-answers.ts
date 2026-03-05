/**
 * Phase 3: Link existing answers to canonical parameters
 *
 * For each accepted normalization mapping (legacy_question → canonical_parameter),
 * find all answers to that legacy question in UPM + Sappi sheets and create
 * canonical_answer_links records.
 *
 * Non-destructive: only creates new records in canonical_answer_links.
 * Existing answers table is untouched.
 *
 * Usage: cd stacks/web && npx tsx scripts/phase3-link-answers.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// UPM and Sappi company IDs
const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';
const SAPPI_ID = '9567b9ac-1c12-457f-8e49-321519c267b3';

async function main() {
  console.log('=== Phase 3: Link Answers to Canonical Parameters ===\n');

  // 1. Get UPM + Sappi sheet IDs
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, requesting_company_id')
    .in('requesting_company_id', [UPM_ID, SAPPI_ID]);

  const sheetIds = new Set((sheets || []).map(s => s.id));
  const upmSheets = (sheets || []).filter(s => s.requesting_company_id === UPM_ID).length;
  const sappiSheets = (sheets || []).filter(s => s.requesting_company_id === SAPPI_ID).length;
  console.log(`UPM sheets: ${upmSheets}, Sappi sheets: ${sappiSheets}, Total: ${sheetIds.size}`);

  // 2. Get accepted normalization mappings
  const { data: mappings } = await supabase
    .from('normalization_mappings')
    .select('id, legacy_question_id, canonical_parameter_id')
    .eq('status', 'accepted');

  console.log(`Accepted mappings: ${mappings?.length || 0}`);

  if (!mappings || mappings.length === 0) {
    console.log('No accepted mappings found. Run bulk-accept-mappings.ts first.');
    return;
  }

  // Build lookup: question_id → { mapping_id, canonical_parameter_id }
  const questionToParam = new Map<string, { mapping_id: string; canonical_parameter_id: string }>();
  for (const m of mappings) {
    if (m.canonical_parameter_id) {
      questionToParam.set(m.legacy_question_id, {
        mapping_id: m.id,
        canonical_parameter_id: m.canonical_parameter_id,
      });
    }
  }

  console.log(`Questions with canonical parameter: ${questionToParam.size}`);

  // 3. Fetch all answers for UPM+Sappi sheets in batches
  // PostgREST has limits on IN clause size, so we batch by sheet
  const sheetIdArray = Array.from(sheetIds);
  const SHEET_BATCH = 50;
  const UPSERT_BATCH = 500;

  let totalAnswers = 0;
  let totalLinked = 0;
  let totalOrphaned = 0;
  let totalSkipped = 0;
  const links: Array<{
    answer_id: string;
    canonical_parameter_id: string;
    normalization_mapping_id: string;
  }> = [];

  console.log(`\nFetching answers in batches of ${SHEET_BATCH} sheets...`);

  for (let i = 0; i < sheetIdArray.length; i += SHEET_BATCH) {
    const batch = sheetIdArray.slice(i, i + SHEET_BATCH);

    // Fetch all answers for this batch of sheets
    // Need to paginate — PostgREST returns max 1000 by default
    let offset = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: answers, error } = await supabase
        .from('answers')
        .select('id, question_id, sheet_id')
        .in('sheet_id', batch)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      if (!answers || answers.length === 0) {
        hasMore = false;
        break;
      }

      for (const answer of answers) {
        totalAnswers++;
        const param = questionToParam.get(answer.question_id);
        if (param) {
          links.push({
            answer_id: answer.id,
            canonical_parameter_id: param.canonical_parameter_id,
            normalization_mapping_id: param.mapping_id,
          });
          totalLinked++;
        } else {
          totalOrphaned++;
        }
      }

      if (answers.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += PAGE_SIZE;
      }
    }

    const pct = Math.round(((i + batch.length) / sheetIdArray.length) * 100);
    process.stdout.write(`\r  Sheets processed: ${i + batch.length}/${sheetIdArray.length} (${pct}%) — ${totalLinked} links found`);
  }

  console.log(`\n\n=== Answer Summary ===`);
  console.log(`Total answers in UPM+Sappi sheets: ${totalAnswers}`);
  console.log(`Linkable to canonical parameters: ${totalLinked}`);
  console.log(`Orphaned (no accepted mapping): ${totalOrphaned}`);
  console.log(`Link rate: ${((totalLinked / totalAnswers) * 100).toFixed(1)}%`);

  // 4. Insert canonical_answer_links in batches
  console.log(`\nInserting ${links.length} canonical_answer_links in batches of ${UPSERT_BATCH}...`);

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < links.length; i += UPSERT_BATCH) {
    const batch = links.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from('canonical_answer_links')
      .upsert(batch, { onConflict: 'answer_id,canonical_parameter_id' });

    if (error) {
      console.error(`\nBatch ${Math.floor(i / UPSERT_BATCH) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
    }

    const pct = Math.round(((i + batch.length) / links.length) * 100);
    process.stdout.write(`\r  Inserted: ${inserted}/${links.length} (${pct}%)`);
  }

  console.log(`\n\n=== Insert Summary ===`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Batch errors: ${errors}`);

  // 5. Verify
  const { count: linkCount } = await supabase
    .from('canonical_answer_links')
    .select('id', { count: 'exact', head: true });

  console.log(`\n=== Verification ===`);
  console.log(`canonical_answer_links rows: ${linkCount}`);

  // Verify existing tables unchanged
  const { count: answerCount } = await supabase.from('answers').select('id', { count: 'exact', head: true });
  const { count: questionCount } = await supabase.from('questions').select('id', { count: 'exact', head: true });
  const { count: sheetCount } = await supabase.from('sheets').select('id', { count: 'exact', head: true });

  console.log(`answers table: ${answerCount} (expected: 84954)`);
  console.log(`questions table: ${questionCount} (expected: 201)`);
  console.log(`sheets table: ${sheetCount} (expected: 775)`);

  // 6. Spot check: canonical parameter coverage
  const { data: paramCoverage } = await supabase
    .from('canonical_answer_links')
    .select('canonical_parameter_id');

  const uniqueParams = new Set((paramCoverage || []).map(r => r.canonical_parameter_id));
  console.log(`\nCanonical parameters with linked answers: ${uniqueParams.size} of 80`);

  // Count links per customer
  const upmSheetSet = new Set((sheets || []).filter(s => s.requesting_company_id === UPM_ID).map(s => s.id));
  const sappiSheetSet = new Set((sheets || []).filter(s => s.requesting_company_id === SAPPI_ID).map(s => s.id));

  // We'd need answer→sheet join to count per customer but that's expensive
  // Just report totals
  console.log(`\n=== Phase 3 Complete ===`);
  console.log(`${inserted} answers linked to canonical parameters`);
  console.log(`Ready for Phase 5 (UI switchover)`);
}

main().catch(err => { console.error(err); process.exit(1); });

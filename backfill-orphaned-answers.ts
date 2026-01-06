import { supabase } from './src/migration/supabase-client.js';
import { createLogger } from './src/migration/utils/logger.js';

const logger = createLogger('BackfillOrphanedAnswers');

interface OrphanedAnswer {
  id: string;
  bubble_id: string;
  company_id: string;
  created_at: string;
}

interface CandidateSheet {
  id: string;
  bubble_id: string;
  name: string;
  company_id: string;
  created_at: string;
  version_close_date: string | null;
}

/**
 * Backfill orphaned answers by matching them to sheets based on:
 * 1. Same company_id
 * 2. Answer created_at is within the sheet's time window
 * 3. Sheet was created before the answer
 * 4. Answer was created before sheet was closed (or sheet is still open)
 */
async function backfillOrphanedAnswers(dryRun = true) {
  logger.info('Starting orphaned answers backfill...');
  logger.info(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  logger.info('');

  // Get count of orphaned answers
  const { count: totalOrphaned } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .is('sheet_id', null);

  logger.info(`Total orphaned answers (missing sheet_id): ${(totalOrphaned || 0).toLocaleString()}`);

  // Process in batches
  const batchSize = 1000;
  let processed = 0;
  let matched = 0;
  let unmatched = 0;
  let offset = 0;

  while (processed < (totalOrphaned || 0)) {
    // Get batch of orphaned answers
    const { data: orphanedAnswers, error } = await supabase
      .from('answers')
      .select('id, bubble_id, company_id, created_at')
      .is('sheet_id', null)
      .not('company_id', 'is', null) // Must have a company
      .order('created_at', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      logger.error('Error fetching orphaned answers:', error);
      break;
    }

    if (!orphanedAnswers || orphanedAnswers.length === 0) break;

    // Group by company to reduce queries
    const byCompany = new Map<string, OrphanedAnswer[]>();
    for (const answer of orphanedAnswers) {
      if (!byCompany.has(answer.company_id)) {
        byCompany.set(answer.company_id, []);
      }
      byCompany.get(answer.company_id)!.push(answer);
    }

    // For each company, get candidate sheets
    for (const [companyId, answers] of byCompany.entries()) {
      const minDate = answers[0].created_at;
      const maxDate = answers[answers.length - 1].created_at;

      // Get sheets for this company that could contain these answers
      const { data: candidateSheets } = await supabase
        .from('sheets')
        .select('id, bubble_id, name, company_id, created_at, version_close_date')
        .eq('company_id', companyId)
        .lte('created_at', maxDate) // Sheet created before or during answer timeframe
        .order('created_at', { ascending: false });

      if (!candidateSheets || candidateSheets.length === 0) {
        logger.warn(`No sheets found for company ${companyId}`);
        unmatched += answers.length;
        continue;
      }

      // Match each answer to a sheet
      const updates: Array<{ answerId: string; sheetId: string; sheetName: string }> = [];

      for (const answer of answers) {
        const answerTime = new Date(answer.created_at).getTime();

        // Find the best matching sheet:
        // - Sheet was created before this answer
        // - Answer was created before sheet was closed (or sheet is still open)
        // - Prefer most recently created sheet that matches
        let bestSheet: CandidateSheet | null = null;

        for (const sheet of candidateSheets) {
          const sheetCreatedTime = new Date(sheet.created_at).getTime();
          const sheetClosedTime = sheet.version_close_date
            ? new Date(sheet.version_close_date).getTime()
            : Date.now();

          // Answer must be after sheet creation and before sheet closure
          if (answerTime >= sheetCreatedTime && answerTime <= sheetClosedTime) {
            bestSheet = sheet;
            break; // Take first match (most recent sheet)
          }
        }

        if (bestSheet) {
          updates.push({
            answerId: answer.id,
            sheetId: bestSheet.id,
            sheetName: bestSheet.name
          });
          matched++;
        } else {
          unmatched++;
        }
      }

      // Apply updates
      if (updates.length > 0) {
        logger.info(`Company ${companyId.substring(0, 8)}... : ${updates.length} answers → ${new Set(updates.map(u => u.sheetId)).size} sheets`);

        if (!dryRun) {
          // Update in batches
          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('answers')
              .update({ sheet_id: update.sheetId })
              .eq('id', update.answerId);

            if (updateError) {
              logger.error(`Failed to update answer ${update.answerId}:`, updateError);
            }
          }
        } else {
          // Show sample in dry run
          const sampleUpdates = updates.slice(0, 3);
          for (const u of sampleUpdates) {
            logger.info(`  Would link answer ${u.answerId.substring(0, 8)}... to sheet "${u.sheetName}"`);
          }
        }
      }
    }

    processed += orphanedAnswers.length;
    offset += batchSize;

    logger.info(`Progress: ${processed}/${totalOrphaned} processed | ${matched} matched | ${unmatched} unmatched`);
  }

  logger.info('');
  logger.success('Backfill complete!');
  logger.info(`Total processed: ${processed.toLocaleString()}`);
  logger.info(`Successfully matched: ${matched.toLocaleString()} (${Math.round(matched / processed * 100)}%)`);
  logger.info(`Could not match: ${unmatched.toLocaleString()} (${Math.round(unmatched / processed * 100)}%)`);
}

// Run with dry run mode by default
const dryRun = process.argv[2] !== '--live';
backfillOrphanedAnswers(dryRun).catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});

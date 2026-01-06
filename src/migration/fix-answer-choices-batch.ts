import { supabase } from './supabase-client.js';
import { preloadChoiceContentCache, getChoiceIdByContent } from './id-mapper.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('FixAnswerChoices');

const BATCH_SIZE = 1000;

async function main() {
  logger.info('Starting choice_id fix for existing answers (BATCH MODE)...');

  // Preload choice content cache
  logger.info('Preloading choice content cache...');
  const choiceCount = await preloadChoiceContentCache();
  logger.info(`Loaded ${choiceCount} choices`);

  // Read the JSON file to get Choice values
  logger.info('Reading JSON file...');
  const fs = await import('fs');
  const fileContent = fs.readFileSync('/Users/scottkaufman/Downloads/export_All-Answers-modified--_2025-12-27_08-33-43.json', 'utf-8');
  const data = JSON.parse(fileContent);
  const answers = Array.isArray(data) ? data : data.results || [];

  logger.info(`Found ${answers.length} answers in JSON`);

  // Filter to only those with Choice values
  const answersWithChoice = answers.filter((a: any) => a.Choice && a.Choice.trim() !== '');
  logger.info(`Found ${answersWithChoice.length} answers with Choice values`);

  // Build update map: bubbleId -> choiceId
  const updateMap = new Map<string, string>();
  let notFound = 0;

  for (const answer of answersWithChoice) {
    const bubbleId = answer['unique id'] || answer._id;
    const choiceText = answer.Choice;

    if (!bubbleId || !choiceText) continue;

    const choiceId = getChoiceIdByContent(choiceText);

    if (!choiceId) {
      notFound++;
      if (notFound <= 10) {
        logger.warn(`Choice not found for text: "${choiceText}"`);
      }
      continue;
    }

    updateMap.set(bubbleId, choiceId);
  }

  logger.info(`Prepared ${updateMap.size} updates (${notFound} choices not found)`);

  // Now update in batches using a single SQL statement per batch
  const bubbleIds = Array.from(updateMap.keys());
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < bubbleIds.length; i += BATCH_SIZE) {
    const batchIds = bubbleIds.slice(i, i + BATCH_SIZE);

    // Process batch in parallel
    const promises = batchIds.map(async (bubbleId) => {
      const choiceId = updateMap.get(bubbleId);
      if (!choiceId) return { success: false };

      const { error: updateError } = await supabase
        .from('answers')
        .update({ choice_id: choiceId })
        .eq('bubble_id', bubbleId);

      if (updateError) {
        return { success: false, error: updateError };
      }
      return { success: true };
    });

    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.success).length;
    updated += successCount;
    errors += results.length - successCount;

    // Progress
    const processed = Math.min(i + BATCH_SIZE, bubbleIds.length);
    if (processed % 5000 === 0 || processed === bubbleIds.length) {
      logger.info(`Progress: ${processed}/${bubbleIds.length} (${Math.round(processed/bubbleIds.length*100)}%) | Updated: ${updated} | Errors: ${errors}`);
    }
  }

  logger.success(`Fix complete! Updated: ${updated}, Not found: ${notFound}, Errors: ${errors}`);
}

main().catch(console.error);

import { supabase } from './supabase-client.js';
import { preloadChoiceContentCache, getChoiceIdByContent } from './id-mapper.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('FixAnswerChoices');

const BATCH_SIZE = 500;

async function main() {
  logger.info('Starting choice_id fix for existing answers...');

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

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < answersWithChoice.length; i += BATCH_SIZE) {
    const batch = answersWithChoice.slice(i, i + BATCH_SIZE);

    for (const answer of batch) {
      const bubbleId = answer['unique id'] || answer._id;
      const choiceText = answer.Choice;

      if (!bubbleId || !choiceText) continue;

      // Look up choice by content
      const choiceId = getChoiceIdByContent(choiceText);

      if (!choiceId) {
        notFound++;
        if (notFound <= 10) {
          logger.warn(`Choice not found for text: "${choiceText}"`);
        }
        continue;
      }

      // Update the answer
      const { error } = await supabase
        .from('answers')
        .update({ choice_id: choiceId })
        .eq('bubble_id', bubbleId);

      if (error) {
        errors++;
        if (errors <= 10) {
          logger.error(`Error updating ${bubbleId}:`, error.message);
        }
      } else {
        updated++;
      }
    }

    // Progress
    const processed = Math.min(i + BATCH_SIZE, answersWithChoice.length);
    if (processed % 5000 === 0 || processed === answersWithChoice.length) {
      logger.info(`Progress: ${processed}/${answersWithChoice.length} (${Math.round(processed/answersWithChoice.length*100)}%) | Updated: ${updated} | Not found: ${notFound} | Errors: ${errors}`);
    }
  }

  logger.success(`Fix complete! Updated: ${updated}, Not found: ${notFound}, Errors: ${errors}`);
}

main().catch(console.error);

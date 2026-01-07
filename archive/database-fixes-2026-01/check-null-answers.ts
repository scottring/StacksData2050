import { bubbleClient } from './src/migration/bubble-client.js';
import { createLogger } from './src/migration/utils/logger.js';

const logger = createLogger('NullAnswerCheck');

// Sample bubble IDs from our completely null answers
const nullAnswerBubbleIds = [
  '1667932315449x575097348969877800',
  '1639742367638x176536649331271460',
  '1639742339437x951525414858837600',
  '1669037133864x408460826308255170',
  '1648379044846x968158693476745500',
];

interface BubbleAnswer {
  _id: string;
  text?: string;
  'text-area'?: string;
  Number?: number;
  Choice?: string;
  'Parent Question'?: string;
  Sheet?: string;
  Company?: string;
  'Created Date'?: string;
}

async function checkNullAnswers() {
  logger.info('Checking Bubble source data for answers that are null in Supabase...\n');

  // Fetch a batch of answers and look for our specific IDs
  let cursor = 0;
  let found = 0;
  let checked = 0;
  const targetIds = new Set(nullAnswerBubbleIds);
  const foundAnswers: BubbleAnswer[] = [];

  while (found < nullAnswerBubbleIds.length && checked < 100000) {
    const response = await bubbleClient.list<BubbleAnswer>('answer', { cursor, limit: 100 });

    for (const answer of response.results) {
      checked++;
      if (targetIds.has(answer._id)) {
        foundAnswers.push(answer);
        found++;
        logger.info(`Found ${found}/${nullAnswerBubbleIds.length}: ${answer._id}`);
      }
    }

    if (response.remaining === 0) break;
    cursor += response.results.length;

    if (checked % 10000 === 0) {
      logger.info(`Checked ${checked} answers, found ${found}/${nullAnswerBubbleIds.length}...`);
    }
  }

  logger.info(`\n=== RESULTS ===`);
  logger.info(`Checked ${checked} total answers from Bubble`);
  logger.info(`Found ${found}/${nullAnswerBubbleIds.length} of our null answer IDs\n`);

  for (const answer of foundAnswers) {
    logger.info(`\nAnswer ID: ${answer._id}`);
    logger.info(`  text: ${answer.text || '(null/empty)'}`);
    logger.info(`  text-area: ${answer['text-area'] || '(null/empty)'}`);
    logger.info(`  Number: ${answer.Number ?? '(null/empty)'}`);
    logger.info(`  Choice: ${answer.Choice || '(null/empty)'}`);
    logger.info(`  Parent Question: ${answer['Parent Question'] || '(null/empty)'}`);
    logger.info(`  Sheet: ${answer.Sheet || '(null/empty)'}`);
    logger.info(`  Company: ${answer.Company || '(null/empty)'}`);
    logger.info(`  Created: ${answer['Created Date'] || '(null/empty)'}`);
  }

  if (foundAnswers.length > 0) {
    const hasAnyValue = foundAnswers.some(a => a.text || a['text-area'] || a.Number || a.Choice);
    if (hasAnyValue) {
      logger.error('\n❌ PROBLEM: Some answers have values in Bubble but are null in Supabase!');
      logger.error('This means data was lost during migration.');
    } else {
      logger.success('\n✅ OK: These answers were also null/empty in Bubble source data.');
      logger.success('No data was lost - they were legitimately empty answers.');
    }
  }
}

checkNullAnswers().catch(err => {
  logger.error('Error checking null answers:', err);
  process.exit(1);
});

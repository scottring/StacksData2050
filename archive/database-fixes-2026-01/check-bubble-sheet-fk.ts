import { bubbleClient } from './src/migration/bubble-client.js';
import { createLogger } from './src/migration/utils/logger.js';

const logger = createLogger('BubbleSheetFK');

interface BubbleAnswer {
  _id: string;
  Sheet?: string;
  text?: string;
  Choice?: string;
  Number?: number;
  'Parent Question'?: string;
  Company?: string;
}

async function checkBubbleSheetFK() {
  // Sample bubble IDs of answers that have values but no sheet_id in Supabase
  const sampleIds = [
    '1762330510677x333307706484023550',
    '1762331052777x264963761013481180',
    '1762330510202x815358870687065900',
  ];

  logger.info('Checking Bubble source for answers missing sheet_id in Supabase...\n');

  for (const bubbleId of sampleIds) {
    let found = false;
    let cursor = 0;
    let checked = 0;

    while (checked < 50000 && !found) {
      const response = await bubbleClient.list<BubbleAnswer>('answer', { cursor, limit: 100 });

      for (const answer of response.results) {
        if (answer._id === bubbleId) {
          logger.info(`\nFound: ${bubbleId}`);
          logger.info(`  Sheet in Bubble: ${answer.Sheet || '(null/empty)'}`);
          logger.info(`  text: ${answer.text || '(null)'}`);
          logger.info(`  Choice: ${answer.Choice || '(null)'}`);
          logger.info(`  Number: ${answer.Number ?? '(null)'}`);
          logger.info(`  Parent Question: ${answer['Parent Question'] || '(null)'}`);
          logger.info(`  Company: ${answer.Company || '(null)'}`);
          found = true;
          break;
        }
      }

      if (response.remaining === 0) break;
      cursor += response.results.length;
      checked += response.results.length;

      if (checked % 10000 === 0) {
        logger.info(`  Searched ${checked} answers for ${bubbleId}...`);
      }
    }

    if (!found) {
      logger.warn(`Did not find ${bubbleId} in first ${checked} Bubble answers`);
    }
  }
}

checkBubbleSheetFK().catch(err => {
  logger.error('Error:', err);
  process.exit(1);
});

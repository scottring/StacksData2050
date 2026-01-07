import { bubbleClient } from './src/migration/bubble-client.js';
import { createLogger } from './src/migration/utils/logger.js';

const logger = createLogger('FindMissingAnswer');

interface BubbleAnswer {
  _id: string;
  text?: string;
  'text-area'?: string;
  Number?: number;
  Choice?: string;
  Sheet?: string;
  'Parent Question'?: string;
  Company?: string;
  'Created Date'?: string;
}

async function findAnswer() {
  const targetId = '1762251945798x475271959129882600';
  logger.info('Searching for bubble_id: ' + targetId);
  
  let cursor = 0;
  let found = false;
  let checked = 0;

  // Search backwards from the end (recent answers)
  const total = await bubbleClient.countAll('answer');
  logger.info('Total answers in Bubble: ' + total.toLocaleString());
  
  // Start from near the end
  cursor = Math.max(0, total - 10000);
  
  while (checked < 50000 && !found) {
    const response = await bubbleClient.list<BubbleAnswer>('answer', { cursor, limit: 100 });
    
    for (const answer of response.results) {
      if (answer._id === targetId) {
        logger.success('\nFOUND IT!');
        logger.info('  Bubble ID: ' + answer._id);
        logger.info('  Sheet: ' + (answer.Sheet || '(null)'));
        logger.info('  Parent Question: ' + (answer['Parent Question'] || '(null)'));
        logger.info('  Company: ' + (answer.Company || '(null)'));
        logger.info('  text: ' + (answer.text || '(null)'));
        logger.info('  Choice: ' + (answer.Choice || '(null)'));
        logger.info('  Number: ' + (answer.Number ?? '(null)'));
        logger.info('  Created: ' + (answer['Created Date'] || '(null)'));
        found = true;
        break;
      }
    }
    
    if (response.remaining === 0) break;
    cursor += response.results.length;
    checked += response.results.length;
    
    if (checked % 5000 === 0) {
      logger.info('  Searched ' + checked + ' answers...');
    }
  }
  
  if (!found) {
    logger.error('Answer not found in last ' + checked + ' Bubble answers');
  }
}

findAnswer().catch(err => {
  logger.error('Error:', err);
  process.exit(1);
});

import { bubbleClient } from './src/migration/bubble-client.js';
import { createLogger } from './src/migration/utils/logger.js';

const logger = createLogger('BubbleCount');

async function countAnswers() {
  const total = await bubbleClient.countAll('answer');
  logger.info('Total answers in Bubble: ' + total.toLocaleString());

  // Get the most recent answers
  const response = await bubbleClient.list('answer', { cursor: 0, limit: 10 });
  logger.info('\nMost recent answers in Bubble:');
  response.results.forEach((a: any, i: number) => {
    const createdDate = a['Created Date'] || 'unknown';
    logger.info('  ' + (i + 1) + '. ' + a._id + ' - Created: ' + createdDate);
  });
}

countAnswers().catch(err => {
  logger.error('Error:', err);
  process.exit(1);
});

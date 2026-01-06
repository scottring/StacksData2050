import { migrateAnswers } from './migrators/answers.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('AnswersOnly');

async function main() {
  logger.info('Starting answers-only migration...');
  const result = await migrateAnswers();
  logger.success(`Done: ${result.migrated} migrated, ${result.skipped} skipped, ${result.failed} failed`);
}

main().catch(console.error);

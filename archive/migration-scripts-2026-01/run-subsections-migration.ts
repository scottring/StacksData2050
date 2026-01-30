import { migrateSubsections } from './src/migration/migrators/subsections.js'
import { createLogger } from './src/migration/utils/logger.js'

const logger = createLogger('SubsectionsMigration')

async function runSubsectionsMigration() {
  logger.info('=== Running Subsections Migration ===\n')

  try {
    const results = await migrateSubsections()

    logger.info('\n=== Migration Complete ===')
    logger.info(`Migrated: ${results.migrated}`)
    logger.info(`Skipped: ${results.skipped}`)
    logger.info(`Failed: ${results.failed}`)

    if (results.failed > 0) {
      logger.warn('Some subsections failed to migrate. Check logs above for details.')
    }
  } catch (error) {
    logger.error('Migration failed:', error)
    process.exit(1)
  }
}

runSubsectionsMigration()

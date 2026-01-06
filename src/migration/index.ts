import { config } from './config.js';
import { createLogger } from './utils/logger.js';

// Import all migrators
import { migrateAssociations } from './migrators/associations.js';
import { migrateStacks } from './migrators/stacks.js';
import { migrateCompanies } from './migrators/companies.js';
import { migrateUsers } from './migrators/users.js';
import { migrateListTables, migrateListTableColumns, migrateListTableRows } from './migrators/list-tables.js';
import { migrateSections } from './migrators/sections.js';
import { migrateSubsections } from './migrators/subsections.js';
import { migrateTags } from './migrators/tags.js';
import { migrateQuestions } from './migrators/questions.js';
import { migrateChoices } from './migrators/choices.js';
import { migrateSheets } from './migrators/sheets.js';
import { migrateAnswers } from './migrators/answers.js';
import { migrateRequests } from './migrators/requests.js';
import { migrateSheetStatuses } from './migrators/sheet-statuses.js';

const logger = createLogger('Migration');

interface MigrationStats {
  migrated: number;
  skipped: number;
  failed: number;
}

interface MigrationResults {
  associations: MigrationStats;
  stacks: MigrationStats;
  companies: MigrationStats;
  users: MigrationStats;
  listTables: MigrationStats;
  listTableColumns: MigrationStats;
  sections: MigrationStats;
  subsections: MigrationStats;
  tags: MigrationStats;
  questions: MigrationStats;
  choices: MigrationStats;
  sheets: MigrationStats;
  listTableRows: MigrationStats;
  answers: MigrationStats;
  requests: MigrationStats;
  sheetStatuses: MigrationStats;
  totalTime: number;
}

const emptyStats = (): MigrationStats => ({ migrated: 0, skipped: 0, failed: 0 });

async function runMigration(): Promise<MigrationResults> {
  const startTime = Date.now();

  logger.info('='.repeat(60));
  logger.info('BUBBLE TO SUPABASE DATA MIGRATION');
  logger.info('='.repeat(60));

  if (config.migration.dryRun) {
    logger.warn('DRY RUN MODE - No data will be written');
  }

  logger.info(`Supabase URL: ${config.supabase.url}`);
  logger.info(`Bubble API: ${config.bubble.apiUrl}`);
  logger.info(`Batch size: ${config.migration.batchSize}`);
  logger.info('');

  const results: MigrationResults = {
    associations: emptyStats(),
    stacks: emptyStats(),
    companies: emptyStats(),
    users: emptyStats(),
    listTables: emptyStats(),
    listTableColumns: emptyStats(),
    sections: emptyStats(),
    subsections: emptyStats(),
    tags: emptyStats(),
    questions: emptyStats(),
    choices: emptyStats(),
    sheets: emptyStats(),
    listTableRows: emptyStats(),
    answers: emptyStats(),
    requests: emptyStats(),
    sheetStatuses: emptyStats(),
    totalTime: 0,
  };

  const totalSteps = 16;

  try {
    // Migration order respects foreign key dependencies

    // 1. Associations (no dependencies)
    logger.info('');
    logger.info(`Step 1/${totalSteps}: Migrating Associations...`);
    results.associations = await migrateAssociations();

    // 2. Stacks (depends on associations)
    logger.info('');
    logger.info(`Step 2/${totalSteps}: Migrating Stacks...`);
    results.stacks = await migrateStacks();

    // 3. Companies (no dependencies, stack_id added)
    logger.info('');
    logger.info(`Step 3/${totalSteps}: Migrating Companies...`);
    results.companies = await migrateCompanies();

    // 4. Users (depends on companies)
    logger.info('');
    logger.info(`Step 4/${totalSteps}: Migrating Users...`);
    results.users = await migrateUsers();

    // 5. List Tables (depends on users for created_by)
    logger.info('');
    logger.info(`Step 5/${totalSteps}: Migrating List Tables...`);
    results.listTables = await migrateListTables();

    // 6. List Table Columns (depends on list tables)
    logger.info('');
    logger.info(`Step 6/${totalSteps}: Migrating List Table Columns...`);
    results.listTableColumns = await migrateListTableColumns();

    // 7. Sections (depends on stacks, associations, users)
    logger.info('');
    logger.info(`Step 7/${totalSteps}: Migrating Sections...`);
    results.sections = await migrateSections();

    // 8. Subsections (depends on sections)
    logger.info('');
    logger.info(`Step 8/${totalSteps}: Migrating Subsections...`);
    results.subsections = await migrateSubsections();

    // 9. Tags (depends on companies, users)
    logger.info('');
    logger.info(`Step 9/${totalSteps}: Migrating Tags...`);
    results.tags = await migrateTags();

    // 10. Questions (depends on companies, users, sections, subsections)
    logger.info('');
    logger.info(`Step 10/${totalSteps}: Migrating Questions...`);
    results.questions = await migrateQuestions();

    // 11. Choices (depends on questions)
    logger.info('');
    logger.info(`Step 11/${totalSteps}: Migrating Choices...`);
    results.choices = await migrateChoices();

    // 12. Sheets (depends on companies, users, stacks)
    logger.info('');
    logger.info(`Step 12/${totalSteps}: Migrating Sheets...`);
    results.sheets = await migrateSheets();

    // 13. List Table Rows (depends on list tables - large table)
    logger.info('');
    logger.info(`Step 13/${totalSteps}: Migrating List Table Rows (~37k records)...`);
    results.listTableRows = await migrateListTableRows();

    // 14. Answers (depends on sheets, questions, companies, users, choices - largest table)
    logger.info('');
    logger.info(`Step 14/${totalSteps}: SKIPPING Answers migration (will use JSON import instead)...`);
    results.answers = { migrated: 0, skipped: 0, failed: 0 };

    // 15. Requests (depends on sheets, companies, users)
    logger.info('');
    logger.info(`Step 15/${totalSteps}: Migrating Requests...`);
    results.requests = await migrateRequests();

    // 16. Sheet Statuses (depends on sheets, companies, users)
    logger.info('');
    logger.info(`Step 16/${totalSteps}: Migrating Sheet Statuses...`);
    results.sheetStatuses = await migrateSheetStatuses();

  } catch (err) {
    logger.error('Migration failed with critical error:', err);
    throw err;
  }

  results.totalTime = (Date.now() - startTime) / 1000;

  // Print summary
  logger.info('');
  logger.info('='.repeat(60));
  logger.info('MIGRATION COMPLETE');
  logger.info('='.repeat(60));
  logger.info('');

  const summaryTable = [
    ['Entity', 'Migrated', 'Skipped', 'Failed'],
    ['Associations', results.associations.migrated, results.associations.skipped, results.associations.failed],
    ['Stacks', results.stacks.migrated, results.stacks.skipped, results.stacks.failed],
    ['Companies', results.companies.migrated, results.companies.skipped, results.companies.failed],
    ['Users', results.users.migrated, results.users.skipped, results.users.failed],
    ['List Tables', results.listTables.migrated, results.listTables.skipped, results.listTables.failed],
    ['List Columns', results.listTableColumns.migrated, results.listTableColumns.skipped, results.listTableColumns.failed],
    ['Sections', results.sections.migrated, results.sections.skipped, results.sections.failed],
    ['Subsections', results.subsections.migrated, results.subsections.skipped, results.subsections.failed],
    ['Tags', results.tags.migrated, results.tags.skipped, results.tags.failed],
    ['Questions', results.questions.migrated, results.questions.skipped, results.questions.failed],
    ['Choices', results.choices.migrated, results.choices.skipped, results.choices.failed],
    ['Sheets', results.sheets.migrated, results.sheets.skipped, results.sheets.failed],
    ['List Rows', results.listTableRows.migrated, results.listTableRows.skipped, results.listTableRows.failed],
    ['Answers', results.answers.migrated, results.answers.skipped, results.answers.failed],
    ['Requests', results.requests.migrated, results.requests.skipped, results.requests.failed],
    ['Sheet Statuses', results.sheetStatuses.migrated, results.sheetStatuses.skipped, results.sheetStatuses.failed],
  ];

  // Calculate totals
  const totals = {
    migrated: Object.values(results)
      .filter((v): v is MigrationStats => typeof v === 'object' && 'migrated' in v)
      .reduce((sum, s) => sum + s.migrated, 0),
    skipped: Object.values(results)
      .filter((v): v is MigrationStats => typeof v === 'object' && 'skipped' in v)
      .reduce((sum, s) => sum + s.skipped, 0),
    failed: Object.values(results)
      .filter((v): v is MigrationStats => typeof v === 'object' && 'failed' in v)
      .reduce((sum, s) => sum + s.failed, 0),
  };

  summaryTable.push(['TOTAL', totals.migrated, totals.skipped, totals.failed]);

  // Print table
  for (const row of summaryTable) {
    logger.info(
      `${String(row[0]).padEnd(15)} | ${String(row[1]).padStart(10)} | ${String(row[2]).padStart(10)} | ${String(row[3]).padStart(10)}`
    );
  }

  logger.info('');
  logger.info(`Total time: ${Math.round(results.totalTime / 60)} minutes ${Math.round(results.totalTime % 60)} seconds`);
  logger.info('');

  if (totals.failed > 0) {
    logger.warn(`There were ${totals.failed} failed records. Check the logs above for details.`);
  }

  if (!config.migration.dryRun) {
    logger.info('');
    logger.info('NEXT STEPS:');
    logger.info('1. Verify record counts match Bubble');
    logger.info('2. Send password reset emails to users');
    logger.info('3. Enable RLS policies on tables');
    logger.info('4. Test the application');
  }

  return results;
}

// Run the migration
runMigration()
  .then(results => {
    logger.success('Migration completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    logger.error('Migration failed:', err);
    process.exit(1);
  });

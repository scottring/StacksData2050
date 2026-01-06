import { supabase } from './supabase-client.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('MigrationVerification');

async function verifyMigration() {
  logger.info('Starting migration verification...');
  logger.info('');

  const tables = [
    'associations',
    'stacks',
    'companies',
    'users',
    'list_tables',
    'list_table_columns',
    'sections',
    'subsections',
    'tags',
    'questions',
    'choices',
    'sheets',
    'list_table_rows',
    'answers',
    'requests',
    'sheet_statuses',
  ];

  // 1. Record counts
  logger.info('=== RECORD COUNTS ===');
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error(`Error counting ${table}:`, error.message);
      counts[table] = -1;
    } else {
      counts[table] = count || 0;
      logger.info(`${table.padEnd(25)} ${(count || 0).toLocaleString()} records`);
    }
  }

  logger.info('');

  // 2. Check for orphaned records (answers without valid foreign keys)
  logger.info('=== FOREIGN KEY INTEGRITY ===');

  const { count: answersWithoutSheet } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('sheet_id', 'is', null)
    .not('sheet_id', 'in', `(select id from sheets)`);

  const { count: answersWithoutQuestion } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('parent_question_id', 'is', null)
    .not('parent_question_id', 'in', `(select id from questions)`);

  logger.info(`Answers with invalid sheet_id: ${answersWithoutSheet || 0}`);
  logger.info(`Answers with invalid parent_question_id: ${answersWithoutQuestion || 0}`);
  logger.info('');

  // 3. Sample data validation
  logger.info('=== SAMPLE DATA VALIDATION ===');

  const { data: sampleAnswers, error: answersError } = await supabase
    .from('answers')
    .select('id, text_value, parent_question_id, sheet_id, company_id')
    .limit(5);

  if (answersError) {
    logger.error('Error fetching sample answers:', answersError.message);
  } else {
    logger.info(`Sample answers: ${sampleAnswers?.length || 0} records fetched`);
    sampleAnswers?.forEach((a, i) => {
      logger.info(`  ${i + 1}. ID: ${a.id.substring(0, 8)}... | Has text: ${!!a.text_value} | Has question: ${!!a.parent_question_id} | Has sheet: ${!!a.sheet_id}`);
    });
  }
  logger.info('');

  // 4. Check ID mappings
  logger.info('=== ID MAPPING VERIFICATION ===');

  const { count: mappingCount } = await supabase
    .from('_migration_id_map')
    .select('*', { count: 'exact', head: true });

  logger.info(`Total ID mappings: ${(mappingCount || 0).toLocaleString()}`);

  const entityTypes = ['company', 'user', 'question', 'sheet', 'answer', 'choice'];
  for (const type of entityTypes) {
    const { count } = await supabase
      .from('_migration_id_map')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', type);

    logger.info(`  ${type.padEnd(15)}: ${(count || 0).toLocaleString()} mappings`);
  }
  logger.info('');

  // 5. Data completeness check
  logger.info('=== DATA COMPLETENESS ===');

  const { count: answersWithText } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .or('text_value.neq.null,text_area_value.neq.null');

  const { count: answersWithChoice } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('choice_id', 'is', null);

  const { count: answersWithNumber } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('number_value', 'is', null);

  logger.info(`Answers with text values: ${(answersWithText || 0).toLocaleString()} (${Math.round((answersWithText || 0) / counts['answers'] * 100)}%)`);
  logger.info(`Answers with choice: ${(answersWithChoice || 0).toLocaleString()} (${Math.round((answersWithChoice || 0) / counts['answers'] * 100)}%)`);
  logger.info(`Answers with number: ${(answersWithNumber || 0).toLocaleString()} (${Math.round((answersWithNumber || 0) / counts['answers'] * 100)}%)`);
  logger.info('');

  // 6. Check for nulls in critical fields
  logger.info('=== CRITICAL FIELDS CHECK ===');

  const { count: answersWithoutBubbleId } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .is('bubble_id', null);

  const { count: companiesWithoutName } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .is('company_name', null);

  const { count: usersWithoutEmail } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .is('email', null);

  logger.info(`Answers missing bubble_id: ${answersWithoutBubbleId || 0}`);
  logger.info(`Companies missing name: ${companiesWithoutName || 0}`);
  logger.info(`Users missing email: ${usersWithoutEmail || 0}`);
  logger.info('');

  // Summary
  logger.info('=== VERIFICATION SUMMARY ===');
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + (count > 0 ? count : 0), 0);
  logger.info(`Total records migrated: ${totalRecords.toLocaleString()}`);
  logger.success('Migration verification complete!');
}

verifyMigration().catch(console.error);

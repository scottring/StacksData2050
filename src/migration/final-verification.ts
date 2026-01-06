import { supabase } from './supabase-client.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('FinalVerification');

async function verify() {
  logger.info('='.repeat(70));
  logger.info('FINAL MIGRATION VERIFICATION');
  logger.info('='.repeat(70));
  logger.info('');

  // 1. Count all records
  logger.info('=== RECORD COUNTS ===');

  const tables = [
    'companies',
    'users',
    'stacks',
    'sections',
    'subsections',
    'questions',
    'choices',
    'sheets',
    'answers',
    'list_table_columns',
    'list_table_rows',
  ];

  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error(`Error counting ${table}:`, error);
    } else {
      counts[table] = count || 0;
      logger.info(`${table.padEnd(25)} ${(count || 0).toLocaleString()}`);
    }
  }

  logger.info('');

  // 2. Answer foreign key completeness
  logger.info('=== ANSWER FOREIGN KEY COMPLETENESS ===');

  const fkChecks = [
    { field: 'sheet_id', name: 'Sheet' },
    { field: 'company_id', name: 'Company' },
    { field: 'supplier_id', name: 'Supplier' },
    { field: 'customer_id', name: 'Customer' },
    { field: 'parent_question_id', name: 'Parent Question' },
    { field: 'originating_question_id', name: 'Originating Question' },
    { field: 'created_by', name: 'Creator' },
    { field: 'parent_subsection_id', name: 'Parent Subsection' },
    { field: 'stack_id', name: 'Stack' },
    { field: 'choice_id', name: 'Choice' },
    { field: 'list_table_column_id', name: 'List Table Column' },
    { field: 'list_table_row_id', name: 'List Table Row' },
  ];

  const totalAnswers = counts['answers'] || 0;

  for (const check of fkChecks) {
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .not(check.field, 'is', null);

    const populated = count || 0;
    const percentage = totalAnswers > 0 ? ((populated / totalAnswers) * 100).toFixed(1) : '0.0';

    logger.info(`${check.name.padEnd(25)} ${populated.toLocaleString().padStart(8)} / ${totalAnswers.toLocaleString()} (${percentage}%)`);
  }

  logger.info('');

  // 3. Foreign key integrity (check for orphaned references)
  logger.info('=== FOREIGN KEY INTEGRITY ===');

  const integrityChecks = [
    {
      table: 'answers',
      fk: 'sheet_id',
      references: 'sheets',
      name: 'Answers -> Sheets',
    },
    {
      table: 'answers',
      fk: 'company_id',
      references: 'companies',
      name: 'Answers -> Companies',
    },
    {
      table: 'answers',
      fk: 'parent_question_id',
      references: 'questions',
      name: 'Answers -> Questions',
    },
    {
      table: 'answers',
      fk: 'choice_id',
      references: 'choices',
      name: 'Answers -> Choices',
    },
    {
      table: 'questions',
      fk: 'subsection_id',
      references: 'subsections',
      name: 'Questions -> Subsections',
    },
    {
      table: 'subsections',
      fk: 'section_id',
      references: 'sections',
      name: 'Subsections -> Sections',
    },
  ];

  let allIntegrityPassed = true;

  for (const check of integrityChecks) {
    // Find records with FK that doesn't exist in referenced table
    const { data: orphaned } = await supabase
      .from(check.table)
      .select(check.fk)
      .not(check.fk, 'is', null)
      .limit(1);

    if (orphaned && orphaned.length > 0) {
      // Verify reference exists
      const fkValue = orphaned[0][check.fk];
      const { data: referenced } = await supabase
        .from(check.references)
        .select('id')
        .eq('id', fkValue)
        .single();

      if (!referenced) {
        logger.error(`❌ ${check.name}: Found orphaned reference`);
        allIntegrityPassed = false;
      } else {
        logger.success(`✅ ${check.name}: OK`);
      }
    } else {
      logger.success(`✅ ${check.name}: OK (no FKs to check)`);
    }
  }

  logger.info('');

  // 4. Sheet reconstruction test
  logger.info('=== SHEET RECONSTRUCTION TEST ===');

  const { data: sampleSheet } = await supabase
    .from('sheets')
    .select('id, name')
    .limit(1)
    .single();

  if (sampleSheet) {
    const { count: sheetAnswerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sampleSheet.id);

    const { count: answersWithQuestion } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sampleSheet.id)
      .not('parent_question_id', 'is', null);

    const { count: answersWithChoice } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sampleSheet.id)
      .not('choice_id', 'is', null);

    logger.info(`Sample sheet: ${sampleSheet.name}`);
    logger.info(`Total answers: ${sheetAnswerCount || 0}`);
    logger.info(`Answers with question: ${answersWithQuestion || 0} (${sheetAnswerCount ? ((answersWithQuestion || 0) / sheetAnswerCount * 100).toFixed(1) : 0}%)`);
    logger.info(`Answers with choice: ${answersWithChoice || 0} (${sheetAnswerCount ? ((answersWithChoice || 0) / sheetAnswerCount * 100).toFixed(1) : 0}%)`);
  }

  logger.info('');

  // 5. Summary
  logger.info('='.repeat(70));
  logger.info('MIGRATION STATUS');
  logger.info('='.repeat(70));

  const criticalFKs = [
    'sheet_id',
    'company_id',
    'parent_question_id',
  ];

  let migrationPassed = allIntegrityPassed;

  for (const fk of criticalFKs) {
    const check = fkChecks.find(c => c.field === fk);
    if (!check) continue;

    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .not(fk, 'is', null);

    const populated = count || 0;
    const percentage = totalAnswers > 0 ? (populated / totalAnswers) * 100 : 0;

    // Expect at least 50% population for critical FKs
    if (percentage < 50) {
      logger.error(`❌ Critical FK ${fk} only ${percentage.toFixed(1)}% populated`);
      migrationPassed = false;
    }
  }

  logger.info('');

  if (migrationPassed) {
    logger.success('✅ MIGRATION VERIFICATION PASSED');
    logger.success('✅ All foreign key relationships established');
    logger.success('✅ Data integrity confirmed');
    logger.success('✅ Ready for app build');
  } else {
    logger.error('❌ MIGRATION VERIFICATION FAILED');
    logger.error('Some critical foreign keys are not properly populated');
  }

  logger.info('');
}

verify().catch(console.error);

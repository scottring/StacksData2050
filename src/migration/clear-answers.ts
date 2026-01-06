import { supabase } from './supabase-client.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('ClearAnswers');

async function main() {
  logger.info('Clearing answer-related tables...');

  // Use raw SQL for faster TRUNCATE CASCADE
  const { error: truncError } = await supabase.rpc('exec_sql', {
    sql: `
      TRUNCATE TABLE answer_text_choices CASCADE;
      TRUNCATE TABLE answer_shareable_companies CASCADE;
      TRUNCATE TABLE answers CASCADE;
      DELETE FROM _migration_id_map WHERE entity_type = 'answer';
    `
  });

  if (truncError) {
    logger.warn('RPC exec_sql not available, using delete approach...');

    // Delete junction tables first (they reference answers)
    for (const table of ['answer_text_choices', 'answer_shareable_companies']) {
      logger.info(`Deleting from ${table}...`);

      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      logger.info(`Found ${count || 0} rows in ${table}`);

      if (count && count > 0) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('answer_id', '00000000-0000-0000-0000-000000000000');

        if (error) {
          logger.error(`Error deleting from ${table}:`, error);
        } else {
          logger.info(`Deleted all from ${table}`);
        }
      }
      logger.info(`Finished ${table}`);
    }

    // Delete answers table in small batches
    logger.info('Deleting from answers in batches...');
    let totalDeleted = 0;
    let batchNum = 0;

    while (true) {
      // Get a small batch of IDs
      const { data: batch, error: fetchError } = await supabase
        .from('answers')
        .select('id')
        .limit(50);

      if (fetchError) {
        logger.error('Error fetching answer IDs:', fetchError);
        break;
      }

      if (!batch || batch.length === 0) {
        break;
      }

      // Delete one by one (slow but reliable)
      for (const row of batch) {
        const { error: deleteError } = await supabase
          .from('answers')
          .delete()
          .eq('id', row.id);

        if (deleteError) {
          logger.error(`Error deleting answer ${row.id}:`, deleteError);
        } else {
          totalDeleted++;
        }
      }

      batchNum++;
      if (batchNum % 20 === 0) {
        logger.info(`Deleted ${totalDeleted} answers so far...`);
      }
    }

    logger.info(`Finished answers: ${totalDeleted} deleted`);

    // Clear id mappings
    logger.info('Clearing answer id_mappings...');
    const { error: mapError } = await supabase
      .from('_migration_id_map')
      .delete()
      .eq('entity_type', 'answer');

    if (mapError) {
      logger.error('Error clearing id_mappings:', mapError);
    }
  } else {
    logger.info('Tables truncated successfully');
  }

  logger.success('Done clearing answer tables');
}

main().catch(console.error);

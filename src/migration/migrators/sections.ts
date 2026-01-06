import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('SectionsMigrator');

interface BubbleSection extends BubbleRecord {
  Name?: string;
  Order?: number;
  Help?: string;
  Stack?: string;
  Association?: string;
  Questions?: string[];
  Questionnaire?: string;
  'Questioniare Text'?: string;
}

interface SupabaseSection {
  bubble_id: string;
  name: string;
  order_number: number | null;
  help: string | null;
  stack_id: string | null;
  association_id: string | null;
  questionnaire_text: string | null;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
}

async function transformSection(bubble: BubbleSection): Promise<SupabaseSection> {
  const stackId = await getSupabaseId(bubble.Stack, 'stack');
  const associationId = await getSupabaseId(bubble.Association, 'association');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');

  return {
    bubble_id: bubble._id,
    name: bubble.Name || 'Unknown Section',
    order_number: bubble.Order || null,
    help: bubble.Help || null,
    stack_id: stackId,
    association_id: associationId,
    questionnaire_text: bubble['Questioniare Text'] || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
  };
}

async function migrateSectionQuestions(
  sectionSupabaseId: string,
  questionBubbleIds: string[]
): Promise<void> {
  if (!questionBubbleIds || questionBubbleIds.length === 0) {
    return;
  }

  const questionIds = await getSupabaseIds(questionBubbleIds, 'question');

  const validEntries = questionIds
    .filter((id): id is string => id !== null)
    .map((questionId, index) => ({
      section_id: sectionSupabaseId,
      question_id: questionId,
      order_number: index,
    }));

  if (validEntries.length > 0) {
    const { error } = await supabase
      .from('section_questions')
      .upsert(validEntries, { onConflict: 'section_id,question_id' });

    if (error) {
      logger.warn(`Failed to insert section_questions for ${sectionSupabaseId}`, error);
    }
  }
}

export async function migrateSections(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting sections migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('section');

  logger.info(`Found ${total} sections to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleSection>(
    'section',
    config.migration.batchSize
  )) {
    for (const section of batch) {
      try {
        if (await isMigrated(section._id, 'section')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate section: ${section.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformSection(section);

        const { data, error } = await supabase
          .from('sections')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(section._id, data.id, 'section');

        // Migrate questions junction (will be populated after questions migration)
        if (section.Questions) {
          await migrateSectionQuestions(data.id, section.Questions);
        }

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate section ${section._id}: ${section.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'sections');
  }

  logger.success(
    `Sections migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

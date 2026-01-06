import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId, getSupabaseIds } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('QuestionsMigrator');

interface BubbleQuestion extends BubbleRecord {
  Name?: string;
  Content?: string;
  'Question Description'?: string;
  Clarification?: string;
  'Clarification yes/no'?: boolean;
  Static?: string;
  'A Q Help'?: string;
  Type?: string;
  ID?: number;
  Order?: number;
  Required?: boolean;
  'Answer Optional'?: boolean;
  'Dependent (no show)'?: boolean;
  Lock?: boolean;
  HighLite?: boolean;
  'Support File Requested'?: boolean;
  'Support file Reason'?: string;
  'SECTION NAME SORT'?: string;
  'SECTION SORT NUMBER'?: number;
  'SUBSECTION NAME SORT'?: string;
  'SUBSECTION SORT NUMBER'?: number;
  Company?: string;
  'Company list'?: string[];
  Stack?: string;
  'Parent Section'?: string;
  'Parent Subsection'?: string;
  'Parent Choice'?: string;
  Association?: string;
  'The association'?: string;
  Questioniear?: string;
  'List Table'?: string;
  Tags?: string[];
}

interface SupabaseQuestion {
  bubble_id: string;
  name: string | null;
  content: string | null;
  question_description: string | null;
  clarification: string | null;
  clarification_yes_no: boolean;
  static_text: string | null;
  a_q_help: string | null;
  question_type: string | null;
  question_id_number: number | null;
  order_number: number | null;
  required: boolean;
  optional_question: boolean;
  dependent_no_show: boolean;
  lock: boolean;
  highlight: boolean;
  support_file_requested: boolean;
  support_file_reason: string | null;
  section_name_sort: string | null;
  section_sort_number: number | null;
  subsection_name_sort: string | null;
  subsection_sort_number: number | null;
  company_id: string | null;
  parent_section_id: string | null;
  parent_subsection_id: string | null;
  parent_choice_id: string | null;
  list_table_id: string | null;
  created_at: string | null;
  modified_at: string | null;
  created_by: string | null;
  slug: string | null;
}

async function transformQuestion(bubble: BubbleQuestion): Promise<SupabaseQuestion> {
  const companyId = await getSupabaseId(bubble.Company, 'company');
  const createdBy = await getSupabaseId(bubble['Created By'], 'user');
  const parentSectionId = await getSupabaseId(bubble['Parent Section'], 'section');
  const parentSubsectionId = await getSupabaseId(bubble['Parent Subsection'], 'subsection');
  const parentChoiceId = await getSupabaseId(bubble['Parent Choice'], 'choice');
  const listTableId = await getSupabaseId(bubble['List Table'], 'list_table');

  return {
    bubble_id: bubble._id,
    name: bubble.Name || null,
    content: bubble.Content || null,
    question_description: bubble['Question Description'] || null,
    clarification: bubble.Clarification || null,
    clarification_yes_no: bubble['Clarification yes/no'] ?? false,
    static_text: bubble.Static || null,
    a_q_help: bubble['A Q Help'] || null,
    question_type: bubble.Type || null,
    question_id_number: bubble.ID || null,
    order_number: bubble.Order || null,
    required: bubble.Required ?? false,
    optional_question: bubble['Answer Optional'] ?? false,
    dependent_no_show: bubble['Dependent (no show)'] ?? false,
    lock: bubble.Lock ?? false,
    highlight: bubble.HighLite ?? false,
    support_file_requested: bubble['Support File Requested'] ?? false,
    support_file_reason: bubble['Support file Reason'] || null,
    section_name_sort: bubble['SECTION NAME SORT'] || null,
    section_sort_number: bubble['SECTION SORT NUMBER'] || null,
    subsection_name_sort: bubble['SUBSECTION NAME SORT'] || null,
    subsection_sort_number: bubble['SUBSECTION SORT NUMBER'] || null,
    company_id: companyId,
    parent_section_id: parentSectionId,
    parent_subsection_id: parentSubsectionId,
    parent_choice_id: parentChoiceId,
    list_table_id: listTableId,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    created_by: createdBy,
    slug: bubble.Slug || null,
  };
}

async function migrateQuestionTags(
  questionSupabaseId: string,
  tagBubbleIds: string[]
): Promise<void> {
  if (!tagBubbleIds || tagBubbleIds.length === 0) {
    return;
  }

  const tagIds = await getSupabaseIds(tagBubbleIds, 'tag');

  const validEntries = tagIds
    .filter((id): id is string => id !== null)
    .map(tagId => ({
      question_id: questionSupabaseId,
      tag_id: tagId,
    }));

  if (validEntries.length > 0) {
    const { error } = await supabase
      .from('question_tags')
      .upsert(validEntries, { onConflict: 'question_id,tag_id' });

    if (error) {
      logger.warn(`Failed to insert question_tags for question ${questionSupabaseId}`, error);
    }
  }
}

async function migrateQuestionCompanies(
  questionSupabaseId: string,
  companyBubbleIds: string[]
): Promise<void> {
  if (!companyBubbleIds || companyBubbleIds.length === 0) {
    return;
  }

  const companyIds = await getSupabaseIds(companyBubbleIds, 'company');

  const validEntries = companyIds
    .filter((id): id is string => id !== null)
    .map(companyId => ({
      question_id: questionSupabaseId,
      company_id: companyId,
    }));

  if (validEntries.length > 0) {
    const { error } = await supabase
      .from('question_companies')
      .upsert(validEntries, { onConflict: 'question_id,company_id' });

    if (error) {
      logger.warn(`Failed to insert question_companies for question ${questionSupabaseId}`, error);
    }
  }
}

export async function migrateQuestions(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting questions migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('question');

  logger.info(`Found ${total} questions to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleQuestion>(
    'question',
    config.migration.batchSize
  )) {
    for (const question of batch) {
      try {
        if (await isMigrated(question._id, 'question')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate question: ${question.Name}`);
          stats.migrated++;
          continue;
        }

        const transformed = await transformQuestion(question);

        const { data, error } = await supabase
          .from('questions')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        await recordMapping(question._id, data.id, 'question');

        // Migrate junction tables
        if (question.Tags) {
          await migrateQuestionTags(data.id, question.Tags);
        }
        if (question['Company list']) {
          await migrateQuestionCompanies(data.id, question['Company list']);
        }

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate question ${question._id}: ${question.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'questions');
  }

  logger.success(
    `Questions migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

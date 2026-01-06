import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import { isMigrated, recordMapping } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('CompaniesMigrator');

interface BubbleCompany extends BubbleRecord {
  Name?: string;
  Active?: boolean;
  'Show as supplier'?: boolean;
  'Hide HQimport'?: boolean;
  isZapier?: boolean;
  'Patch Status Applied'?: boolean;
  EmailSuffix?: string;
  'location text'?: string;
  Logo?: string;
  'Plan Started'?: string;
  'Subscription Anniversary Date'?: string;
  'Subscription Trial Ends'?: string;
  'Subscription Cancel at trial'?: boolean;
  'Subscription Canceled during pay'?: boolean;
  'Subscription Expired'?: boolean;
  'Subscription sheets allowed'?: number;
  'Premium Features Requested'?: string[];
  'List Emails Prefix'?: string[];
  Stacks?: string; // Reference to stack
  'The Association'?: string; // Reference to association
}

interface SupabaseCompany {
  bubble_id: string;
  name: string;
  name_lower_case: string | null;
  email_suffix: string | null;
  location_text: string | null;
  logo_url: string | null;
  active: boolean;
  show_as_supplier: boolean;
  hide_hq_import: boolean;
  is_zapier: boolean;
  patch_status_applied: boolean;
  plan_started_at: string | null;
  subscription_anniversary_date: string | null;
  subscription_trial_ends: string | null;
  subscription_cancel_at_trial: boolean;
  subscription_canceled: boolean;
  subscription_expired: boolean;
  subscription_sheets_allowed: number | null;
  premium_features_requested: string[] | null;
  list_emails_prefix: string[] | null;
  created_at: string | null;
  modified_at: string | null;
  slug: string | null;
}

function transformCompany(bubble: BubbleCompany): SupabaseCompany {
  const name = bubble.Name || 'Unknown Company';

  return {
    bubble_id: bubble._id,
    name,
    name_lower_case: name.toLowerCase(),
    email_suffix: bubble.EmailSuffix || null,
    location_text: bubble['location text'] || null,
    logo_url: bubble.Logo || null,
    active: bubble.Active ?? true,
    show_as_supplier: bubble['Show as supplier'] ?? false,
    hide_hq_import: bubble['Hide HQimport'] ?? false,
    is_zapier: bubble.isZapier ?? false,
    patch_status_applied: bubble['Patch Status Applied'] ?? false,
    plan_started_at: bubble['Plan Started'] || null,
    subscription_anniversary_date: bubble['Subscription Anniversary Date'] || null,
    subscription_trial_ends: bubble['Subscription Trial Ends'] || null,
    subscription_cancel_at_trial: bubble['Subscription Cancel at trial'] ?? false,
    subscription_canceled: bubble['Subscription Canceled during pay'] ?? false,
    subscription_expired: bubble['Subscription Expired'] ?? false,
    subscription_sheets_allowed: bubble['Subscription sheets allowed'] || null,
    premium_features_requested: bubble['Premium Features Requested'] || null,
    list_emails_prefix: bubble['List Emails Prefix'] || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    slug: bubble.Slug || null,
  };
}

export async function migrateCompanies(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting companies migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('company');

  logger.info(`Found ${total} companies to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleCompany>(
    'company',
    config.migration.batchSize
  )) {
    for (const company of batch) {
      try {
        // Check if already migrated
        if (await isMigrated(company._id, 'company')) {
          stats.skipped++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate company: ${company.Name}`);
          stats.migrated++;
          continue;
        }

        // Transform and insert
        const transformed = transformCompany(company);

        const { data, error } = await supabase
          .from('companies')
          .insert(transformed)
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        // Record the ID mapping
        await recordMapping(company._id, data.id, 'company');

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        logger.error(`Failed to migrate company ${company._id}: ${company.Name}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'companies');
  }

  logger.success(
    `Companies migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

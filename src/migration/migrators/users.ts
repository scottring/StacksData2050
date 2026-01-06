import { bubbleClient, BubbleRecord } from '../bubble-client.js';
import { supabase, handleSupabaseError } from '../supabase-client.js';
import { isMigrated, recordMapping, getSupabaseId } from '../id-mapper.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config.js';

const logger = createLogger('UsersMigrator');

interface BubbleUser extends BubbleRecord {
  authentication?: {
    email?: {
      email?: string;
      email_confirmed?: boolean;
    };
  };
  'First name'?: string;
  'Last name'?: string;
  'Full Name'?: string;
  'Phone text'?: string;
  Phone?: number;
  profile_pic?: string;
  Company?: string; // Bubble company ID
  'user-type'?: string;
  Language?: string;
  'is comp get email notifications'?: boolean;
  'is comp point person'?: boolean;
  'is sup point person'?: boolean;
  'is sup get email notifications'?: boolean;
  'is sup cert manager'?: boolean;
  'is sup cert tmplt creator'?: boolean;
  'is sup cert reviewer'?: boolean;
  'is sup view question menu'?: boolean;
  'Invitation sent'?: boolean;
  'Password changed'?: boolean;
  'Profile done'?: boolean;
  'Is Prospect'?: boolean;
  'Is in a payed or established plan'?: boolean;
  'Prospect Agree Terms Priv'?: boolean;
  'Prospect Paid'?: boolean;
  'Prospect Company Text'?: string;
  'Prospect Plan'?: string;
  'Plan first started'?: string;
  'Self Sign Up Invitation Code'?: string;
  OneTimeMessage?: string;
  Comments?: string;
  a_lnk?: string;
  'Email Count'?: number;
  Stack?: string;
  'Emails changes'?: string[];
  'Email Changes Dates'?: string[];
}

interface SupabaseUser {
  id: string; // Use the auth.users.id
  bubble_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone_text: string | null;
  phone_number: number | null;
  profile_pic_url: string | null;
  company_id: string | null;
  user_type: string | null;
  language: string | null;
  is_company_main_contact: boolean;
  is_company_point_person: boolean;
  is_supplier_pointguard: boolean;
  is_sup_get_email_notifications: boolean;
  is_sup_cert_manager: boolean;
  is_sup_cert_tmplt_creator: boolean;
  is_sup_reviewer: boolean;
  is_sup_view_question_menu: boolean;
  invitation_sent: boolean;
  password_changed: boolean;
  profile_done: boolean;
  is_prospect: boolean;
  is_in_payed_or_established_plan: boolean;
  prospect_agree: boolean;
  prospect_paid: boolean;
  prospect_company_text: string | null;
  plan_first_started: string | null;
  self_sign_up_invitation_code: string | null;
  one_time_message: string | null;
  comments: string | null;
  a_lnk: string | null;
  email_count: number;
  emails_changes: string[] | null;
  email_changes_dates: string[] | null;
  created_at: string | null;
  modified_at: string | null;
  slug: string | null;
}

async function createAuthUser(
  email: string,
  bubbleId: string,
  firstName?: string,
  lastName?: string
): Promise<string | null> {
  // Create user in Supabase Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true, // Mark email as confirmed
    user_metadata: {
      bubble_id: bubbleId,
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error) {
    // Check if user already exists
    if (error.message.includes('already been registered')) {
      // Try to find the existing user
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === email);
      if (existingUser) {
        logger.debug(`Auth user already exists for ${email}, using existing ID`);
        return existingUser.id;
      }
    }
    logger.error(`Failed to create auth user for ${email}`, error);
    return null;
  }

  return data.user.id;
}

async function transformUser(
  bubble: BubbleUser,
  authUserId: string
): Promise<SupabaseUser> {
  // Get the Supabase company ID
  const companyId = bubble.Company
    ? await getSupabaseId(bubble.Company, 'company')
    : null;

  const email = bubble.authentication?.email?.email || null;

  return {
    id: authUserId,
    bubble_id: bubble._id,
    email,
    first_name: bubble['First name'] || null,
    last_name: bubble['Last name'] || null,
    full_name: bubble['Full Name'] || null,
    phone_text: bubble['Phone text'] || null,
    phone_number: bubble.Phone || null,
    profile_pic_url: bubble.profile_pic || null,
    company_id: companyId,
    user_type: bubble['user-type'] || null,
    language: bubble.Language || null,
    is_company_main_contact: bubble['is comp get email notifications'] ?? false,
    is_company_point_person: bubble['is comp point person'] ?? false,
    is_supplier_pointguard: bubble['is sup point person'] ?? false,
    is_sup_get_email_notifications: bubble['is sup get email notifications'] ?? false,
    is_sup_cert_manager: bubble['is sup cert manager'] ?? false,
    is_sup_cert_tmplt_creator: bubble['is sup cert tmplt creator'] ?? false,
    is_sup_reviewer: bubble['is sup cert reviewer'] ?? false,
    is_sup_view_question_menu: bubble['is sup view question menu'] ?? false,
    invitation_sent: bubble['Invitation sent'] ?? false,
    password_changed: bubble['Password changed'] ?? false,
    profile_done: bubble['Profile done'] ?? false,
    is_prospect: bubble['Is Prospect'] ?? false,
    is_in_payed_or_established_plan: bubble['Is in a payed or established plan'] ?? false,
    prospect_agree: bubble['Prospect Agree Terms Priv'] ?? false,
    prospect_paid: bubble['Prospect Paid'] ?? false,
    prospect_company_text: bubble['Prospect Company Text'] || null,
    plan_first_started: bubble['Plan first started'] || null,
    self_sign_up_invitation_code: bubble['Self Sign Up Invitation Code'] || null,
    one_time_message: bubble.OneTimeMessage || null,
    comments: bubble.Comments || null,
    a_lnk: bubble.a_lnk || null,
    email_count: bubble['Email Count'] ?? 0,
    emails_changes: bubble['Emails changes'] || null,
    email_changes_dates: bubble['Email Changes Dates'] || null,
    created_at: bubble['Created Date'] || null,
    modified_at: bubble['Modified Date'] || null,
    slug: bubble.Slug || null,
  };
}

export async function migrateUsers(): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
}> {
  logger.info('Starting users migration...');

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const total = await bubbleClient.countAll('user');

  logger.info(`Found ${total} users to migrate`);

  for await (const batch of bubbleClient.iterateAll<BubbleUser>(
    'user',
    config.migration.batchSize
  )) {
    for (const user of batch) {
      try {
        // Check if already migrated
        if (await isMigrated(user._id, 'user')) {
          stats.skipped++;
          continue;
        }

        const email = user.authentication?.email?.email;

        if (!email) {
          logger.warn(`User ${user._id} has no email, skipping auth user creation`);
          stats.failed++;
          continue;
        }

        if (config.migration.dryRun) {
          logger.debug(`[DRY RUN] Would migrate user: ${email}`);
          stats.migrated++;
          continue;
        }

        // Create Supabase Auth user first
        const authUserId = await createAuthUser(
          email,
          user._id,
          user['First name'],
          user['Last name']
        );

        if (!authUserId) {
          logger.error(`Failed to create auth user for ${email}`);
          stats.failed++;
          continue;
        }

        // Transform and insert into public.users
        const transformed = await transformUser(user, authUserId);

        const { error } = await supabase
          .from('users')
          .insert(transformed);

        if (error) {
          // If the user table insert fails, we should note this but the auth user is created
          logger.error(`Failed to insert into users table for ${email}`, error);
          stats.failed++;
          continue;
        }

        // Record the ID mapping (using auth user ID as the supabase ID)
        await recordMapping(user._id, authUserId, 'user');

        stats.migrated++;
      } catch (err) {
        stats.failed++;
        const email = user.authentication?.email?.email || 'unknown';
        logger.error(`Failed to migrate user ${user._id}: ${email}`, err);
      }
    }

    logger.progress(stats.migrated + stats.skipped + stats.failed, total, 'users');
  }

  logger.success(
    `Users migration complete: ${stats.migrated} migrated, ${stats.skipped} skipped, ${stats.failed} failed`
  );

  return stats;
}

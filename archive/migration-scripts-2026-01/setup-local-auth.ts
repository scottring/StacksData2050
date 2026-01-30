/**
 * Set up a test auth user for local Supabase
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function main() {
  // Find any user with a company (to get sheets)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, full_name, company_id')
    .not('company_id', 'is', null)
    .limit(1)
    .single();

  console.log('Found existing user:', existingUser);

  if (!existingUser) {
    console.error('No user with company found');
    return;
  }

  // Create auth user with same ID
  const testEmail = 'test@local.dev';
  const { data: authUser, error } = await supabase.auth.admin.createUser({
    id: existingUser.id,
    email: testEmail,
    password: 'test1234',
    email_confirm: true,
    user_metadata: { full_name: 'Test User' }
  });

  if (error) {
    console.error('Error creating auth user:', error.message);
  } else {
    console.log('Created auth user with ID:', authUser.user?.id);

    // Update the user record to use the test email
    await supabase
      .from('users')
      .update({ email: testEmail, full_name: 'Test User' })
      .eq('id', existingUser.id);

    console.log('\n✅ You can now log in with:');
    console.log('   Email: test@local.dev');
    console.log('   Password: test1234');
    console.log('\n   Company ID:', existingUser.company_id);
  }
}

main();

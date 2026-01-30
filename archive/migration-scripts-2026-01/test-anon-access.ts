import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function testAnonAccess() {
  console.log('=== Testing Anonymous Access ===\n');

  // Get the anon key from the Supabase dashboard or generate one
  // For now, let's try to understand what's happening
  
  const serviceClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // First, let's verify data exists with service role
  console.log('1. Service Role Access (bypasses RLS):');
  const { data: choicesService, error: choicesServiceError, count: choicesServiceCount } = await serviceClient
    .from('choices')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Choices: ${choicesServiceCount} rows`, choicesServiceError ? `Error: ${choicesServiceError.message}` : '✓');

  const { data: answersService, error: answersServiceError, count: answersServiceCount } = await serviceClient
    .from('answers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Answers: ${answersServiceCount} rows`, answersServiceError ? `Error: ${answersServiceError.message}` : '✓');

  // Try to determine if RLS is enabled by attempting anonymous access
  // We'll use a public anon key - typically it starts with 'eyJ' and is safe to expose
  
  console.log('\n2. Testing what anonymous access would look like:');
  console.log('   Note: Without SUPABASE_ANON_KEY in .env, we cannot test anonymous access directly.');
  console.log('   The anon key is typically found in Supabase Dashboard > Settings > API');
  
  // Let's check if there are any public grants
  console.log('\n3. Checking table information:');
  
  const choicesSample = await serviceClient.from('choices').select('*').limit(1).single();
  const answersSample = await serviceClient.from('answers').select('*').limit(1).single();
  
  console.log('\n   If RLS is blocking anonymous access, you need to:');
  console.log('   a) Add RLS policies that allow public SELECT access, OR');
  console.log('   b) Disable RLS on these tables if they should be publicly readable');
  
  console.log('\n4. To check current RLS status, run this SQL in Supabase Dashboard:');
  console.log('   --------------------------------------------------------');
  console.log('   SELECT tablename, rowsecurity FROM pg_tables');
  console.log('   WHERE tablename IN (\'choices\', \'answers\') AND schemaname = \'public\';');
  console.log('   --------------------------------------------------------');
  
  console.log('\n5. To check current RLS policies:');
  console.log('   --------------------------------------------------------');
  console.log('   SELECT schemaname, tablename, policyname, cmd, roles, qual');
  console.log('   FROM pg_policies');
  console.log('   WHERE tablename IN (\'choices\', \'answers\');');
  console.log('   --------------------------------------------------------');
  
  console.log('\n6. If RLS is enabled but no policies exist for anonymous/public access:');
  console.log('   This explains why anonymous client returns 0 rows!');
  console.log('   RLS enabled + no matching policies = no data returned');
}

testAnonAccess();

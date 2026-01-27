import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRLSPolicies() {
  console.log('=== Checking RLS Status and Policies ===\n');

  // Check if RLS is enabled on the tables
  const { data: rlsStatus, error: rlsError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE tablename IN ('choices', 'answers')
          AND schemaname = 'public'
        ORDER BY tablename;
      `
    });

  if (rlsError) {
    console.error('Error checking RLS status:', rlsError);
  } else {
    console.log('RLS Status:');
    console.table(rlsStatus);
  }

  // Check policies for choices table
  console.log('\n=== Policies for choices table ===\n');
  
  const { data: choicesPolicies, error: choicesError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          policyname as policy_name,
          cmd as command,
          permissive,
          roles,
          qual as using_expression,
          with_check as with_check_expression
        FROM pg_policies
        WHERE tablename = 'choices'
          AND schemaname = 'public'
        ORDER BY policyname;
      `
    });

  if (choicesError) {
    console.error('Error fetching choices policies:', choicesError);
  } else if (choicesPolicies && choicesPolicies.length > 0) {
    console.log('Choices policies:');
    console.table(choicesPolicies);
  } else {
    console.log('No RLS policies found on choices table');
  }

  // Check policies for answers table
  console.log('\n=== Policies for answers table ===\n');
  
  const { data: answersPolicies, error: answersError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          policyname as policy_name,
          cmd as command,
          permissive,
          roles,
          qual as using_expression,
          with_check as with_check_expression
        FROM pg_policies
        WHERE tablename = 'answers'
          AND schemaname = 'public'
        ORDER BY policyname;
      `
    });

  if (answersError) {
    console.error('Error fetching answers policies:', answersError);
  } else if (answersPolicies && answersPolicies.length > 0) {
    console.log('Answers policies:');
    console.table(answersPolicies);
  } else {
    console.log('No RLS policies found on answers table');
  }

  // Test anonymous access
  console.log('\n=== Testing Anonymous Access ===\n');
  
  const anonClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { count: choicesCount, error: choicesCountError } = await anonClient
    .from('choices')
    .select('*', { count: 'exact', head: true });

  console.log('Choices count (anonymous):', choicesCount, choicesCountError ? `Error: ${choicesCountError.message}` : '');

  const { count: answersCount, error: answersCountError } = await anonClient
    .from('answers')
    .select('*', { count: 'exact', head: true });

  console.log('Answers count (anonymous):', answersCount, answersCountError ? `Error: ${answersCountError.message}` : '');
}

checkRLSPolicies();

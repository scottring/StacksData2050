import { supabase } from './src/migration/supabase-client.js';

async function checkRLS() {
  console.log('=== Checking Table Schemas and RLS ===\n');

  // Get sample from choices table
  console.log('=== Choices Table Sample ===');
  const { data: choicesSample, error: choicesError } = await supabase
    .from('choices')
    .select('*')
    .limit(1);

  if (choicesError) {
    console.log('Error:', choicesError.message);
  } else if (choicesSample && choicesSample.length > 0) {
    console.log('Columns:', Object.keys(choicesSample[0]));
    console.log('Sample:', choicesSample[0]);
  }

  // Get sample from answers table
  console.log('\n=== Answers Table Sample ===');
  const { data: answersSample, error: answersError } = await supabase
    .from('answers')
    .select('*')
    .limit(1);

  if (answersError) {
    console.log('Error:', answersError.message);
  } else if (answersSample && answersSample.length > 0) {
    console.log('Columns:', Object.keys(answersSample[0]));
    console.log('Sample:', answersSample[0]);
  }

  // Now let's manually construct a SQL query to check RLS policies
  // We'll use a workaround by creating a temporary function
  console.log('\n=== Attempting to Check RLS Status ===\n');
  
  // Try to read from information_schema
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name, table_schema')
    .eq('table_schema', 'public')
    .in('table_name', ['choices', 'answers']);

  if (tablesError) {
    console.log('Cannot query information_schema:', tablesError.message);
  } else {
    console.log('Tables found:', tables);
  }
}

checkRLS();

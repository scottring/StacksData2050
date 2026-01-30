import { supabase } from './src/migration/supabase-client.js';

async function checkRLS() {
  console.log('=== Checking RLS Policies ===\n');

  // Query pg_policies view directly
  const { data: allData, error } = await supabase
    .from('pg_policies')
    .select('*')
    .or('tablename.eq.choices,tablename.eq.answers');

  if (error) {
    console.log('Cannot query pg_policies via Supabase client:', error.message);
    console.log('\nTrying alternative approach...\n');
  } else {
    console.log('Policies found:', allData);
  }

  // Try to query the tables directly with service role to see row counts
  console.log('=== Row Counts (Service Role) ===\n');
  
  const { count: choicesCount, error: choicesError } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true });

  console.log(`Choices: ${choicesCount} rows`, choicesError ? `(Error: ${choicesError.message})` : '');

  const { count: answersCount, error: answersError } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  console.log(`Answers: ${answersCount} rows`, answersError ? `(Error: ${answersError.message})` : '');

  // Check if we can query a sample row
  console.log('\n=== Sample Data Check ===\n');
  
  const { data: sampleChoice, error: sampleChoiceError } = await supabase
    .from('choices')
    .select('id, text, question_id')
    .limit(1);

  if (sampleChoiceError) {
    console.log('Error fetching sample choice:', sampleChoiceError.message);
  } else {
    console.log('Sample choice:', sampleChoice?.[0]);
  }

  const { data: sampleAnswer, error: sampleAnswerError } = await supabase
    .from('answers')
    .select('id, question_id, sheet_id')
    .limit(1);

  if (sampleAnswerError) {
    console.log('Error fetching sample answer:', sampleAnswerError.message);
  } else {
    console.log('Sample answer:', sampleAnswer?.[0]);
  }
}

checkRLS();

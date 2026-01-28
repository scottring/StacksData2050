const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yrguoooxamecsjtkfqcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNjQ1OSwiZXhwIjoyMDgwMTkyNDU5fQ.vJjf-cGgyumKE2nPec1-vOik3lFn7lvlQM0xcNiiPbk'
);

async function main() {
  // Check answers schema
  const { data: answer, error: ansErr } = await supabase.from('answers').select('*').limit(1).single();
  console.log('Answers columns:', answer ? Object.keys(answer) : 'No data');
  if (ansErr) console.log('Answers error:', ansErr);

  // Check choices schema again
  const { data: choice, error: choErr } = await supabase.from('choices').select('*').limit(1).single();
  console.log('\nChoices columns:', choice ? Object.keys(choice) : 'No data');
  if (choErr) console.log('Choices error:', choErr);
}

main();

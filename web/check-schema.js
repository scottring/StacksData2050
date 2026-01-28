const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yrguoooxamecsjtkfqcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNjQ1OSwiZXhwIjoyMDgwMTkyNDU5fQ.vJjf-cGgyumKE2nPec1-vOik3lFn7lvlQM0xcNiiPbk'
);

async function main() {
  // Get choice schema by selecting one row
  const { data: choice, error } = await supabase.from('choices').select('*').limit(1).single();
  console.log('Choice columns:', choice ? Object.keys(choice) : 'No data');
  console.log('Sample choice:', choice);
  if (error) console.log('Error:', error);
}

main();

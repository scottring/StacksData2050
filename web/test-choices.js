const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yrguoooxamecsjtkfqcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNjQ1OSwiZXhwIjoyMDgwMTkyNDU5fQ.vJjf-cGgyumKE2nPec1-vOik3lFn7lvlQM0xcNiiPbk'
);

async function main() {
  // Get a Dropdown question
  const { data: dropdownQ } = await supabase
    .from('questions')
    .select('id, name, response_type')
    .eq('response_type', 'Dropdown')
    .limit(1)
    .single();
  
  console.log('Dropdown question:', dropdownQ?.id);

  // Get choices for this question using question_id (the correct column)
  const { data: choices, error } = await supabase
    .from('choices')
    .select('id, content, question_id')
    .eq('question_id', dropdownQ?.id);
  
  console.log('\nChoices for this question:');
  choices?.forEach(c => console.log('  -', c.content));
  if (error) console.log('Error:', error);

  // Test the full fetch like the page does
  const { data: allChoices, error: err2 } = await supabase
    .from('choices')
    .select('id, content, question_id')
    .order('order_number');
  
  console.log('\nTotal choices fetched:', allChoices?.length);
  
  // Group by question_id like the simple-editor does
  const map = new Map();
  allChoices?.forEach(c => {
    if (c.question_id) {
      if (!map.has(c.question_id)) {
        map.set(c.question_id, []);
      }
      map.get(c.question_id).push(c);
    }
  });
  console.log('Questions with choices:', map.size);

  // Check if our dropdown question has choices in the map
  if (dropdownQ) {
    const qChoices = map.get(dropdownQ.id);
    console.log('\nOur dropdown question has', qChoices?.length || 0, 'choices in map');
  }
}

main();

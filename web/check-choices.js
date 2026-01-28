const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yrguoooxamecsjtkfqcw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYxNjQ1OSwiZXhwIjoyMDgwMTkyNDU5fQ.vJjf-cGgyumKE2nPec1-vOik3lFn7lvlQM0xcNiiPbk'
);

async function main() {
  // Get unique response types
  const { data: types } = await supabase.from('questions').select('response_type').limit(500);
  const uniqueTypes = [...new Set(types?.map(t => t.response_type) || [])];
  console.log('Response types in questions:', uniqueTypes);

  // Get some choices
  const { data: choices, error } = await supabase.from('choices').select('id, content, parent_question_id').limit(10);
  console.log('\nSample choices:', choices);
  if (error) console.log('Choices error:', error);

  // Check if choices have parent_question_id
  const { data: allChoices } = await supabase.from('choices').select('id, parent_question_id').limit(1000);
  const withParent = allChoices?.filter(c => c.parent_question_id) || [];
  console.log('\nTotal choices fetched:', allChoices?.length, 'With parent_question_id:', withParent.length);

  // Get a choice question to test
  const { data: choiceQuestions } = await supabase.from('questions').select('id, name, response_type').eq('response_type', 'Dropdown').limit(5);
  console.log('\nDropdown questions:', choiceQuestions);

  const { data: selectOneQuestions } = await supabase.from('questions').select('id, name, response_type').eq('response_type', 'Select One').limit(5);
  console.log('\nSelect One questions:', selectOneQuestions);

  // Check for choices linked to Select One questions
  if (selectOneQuestions?.length > 0) {
    const qid = selectOneQuestions[0].id;
    const { data: qChoices } = await supabase.from('choices').select('*').eq('parent_question_id', qid);
    console.log('\nChoices for first Select One question:', qid, qChoices);
  }
}

main();

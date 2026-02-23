const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get one answer to see its columns
  const { data: sample, error } = await supabase.from('answers').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  if (sample && sample.length > 0) {
    console.log('Answer columns:', Object.keys(sample[0]).join(', '));
    console.log();
    console.log('Sample answer:');
    console.log(JSON.stringify(sample[0], null, 2));
  }

  // Now get a trial-period answer
  const { data: trialSample } = await supabase.from('answers').select('*').gte('created_at', '2026-02-01').limit(5);
  console.log();
  console.log('Trial answers (since Feb 1), first 5:');
  for (const a of trialSample || []) {
    console.log(JSON.stringify(a, null, 2));
  }

  // Total trial answers
  const { count } = await supabase.from('answers').select('*', { count: 'exact', head: true }).gte('created_at', '2026-02-01');
  console.log();
  console.log('Total answers created since Feb 1:', count);

  // Check if there's a sheet_id or similar column
  const { data: one } = await supabase.from('answers').select('*').limit(1);
  if (one && one[0]) {
    const cols = Object.keys(one[0]);
    const sheetCols = cols.filter(c => c.includes('sheet'));
    console.log('Sheet-related columns:', sheetCols.length > 0 ? sheetCols.join(', ') : 'NONE');
    const questionCols = cols.filter(c => c.includes('question'));
    console.log('Question-related columns:', questionCols.length > 0 ? questionCols.join(', ') : 'NONE');
  }
}

check();

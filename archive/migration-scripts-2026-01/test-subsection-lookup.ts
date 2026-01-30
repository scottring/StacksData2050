import { supabase } from './src/migration/supabase-client.js';

async function testLookup() {
  const ids = [
    'd67f886e-5ef4-4968-aba8-ec2fc236a035',
    '0686e11d-d17b-4374-8d8a-80287320bcf3',
    '4f777663-616a-4fda-9e10-718c92d8470e',
    '2de50963-f323-4554-9bd5-2a33aef27446'
  ];

  console.log('Testing subsection lookups:\n');

  for (const id of ids) {
    // Try .single()
    const { data: single, error: singleError } = await supabase
      .from('subsections')
      .select('id, name')
      .eq('id', id)
      .single();

    // Try without .single()
    const { data: multi, error: multiError } = await supabase
      .from('subsections')
      .select('id, name')
      .eq('id', id);

    console.log(`${id.substring(0, 8)}...`);
    console.log(`  .single(): ${single ? single.name : 'NOT FOUND'}`);
    if (singleError) console.log(`    Error: ${singleError.message}`);
    console.log(`  no .single(): ${multi && multi.length > 0 ? multi[0].name : 'NOT FOUND'}`);
    if (multiError) console.log(`    Error: ${multiError.message}`);
    console.log('');
  }
}

testLookup().catch(console.error);

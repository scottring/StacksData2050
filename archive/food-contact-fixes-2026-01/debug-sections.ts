import { supabase } from './src/migration/supabase-client.js'

async function debugSections() {
  console.log('=== Testing different query approaches ===\n')

  // Test 1: Basic select all
  console.log('Test 1: Basic select all')
  const { data: data1, error: error1 } = await supabase
    .from('sections')
    .select('*')

  console.log(`  Result: ${data1?.length || 0} records, error: ${error1?.message || 'none'}`)
  if (data1 && data1.length > 0) {
    console.log(`  First record:`, data1[0])
  }

  // Test 2: Select specific columns
  console.log('\nTest 2: Select specific columns')
  const { data: data2, error: error2 } = await supabase
    .from('sections')
    .select('id, name, number')

  console.log(`  Result: ${data2?.length || 0} records, error: ${error2?.message || 'none'}`)
  if (data2 && data2.length > 0) {
    console.log(`  First record:`, data2[0])
  }

  // Test 3: Select with range
  console.log('\nTest 3: Select with range')
  const { data: data3, error: error3 } = await supabase
    .from('sections')
    .select('id, name, number')
    .range(0, 9)

  console.log(`  Result: ${data3?.length || 0} records, error: ${error3?.message || 'none'}`)
  if (data3 && data3.length > 0) {
    data3.forEach(s => console.log(`    ${s.number} - ${s.name}`))
  }
}

debugSections()

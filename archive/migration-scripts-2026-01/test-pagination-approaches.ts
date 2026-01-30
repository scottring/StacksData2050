import { supabase } from './src/migration/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testPaginationApproaches() {
  console.log('🧪 TESTING DIFFERENT PAGINATION APPROACHES\n');

  // Test 1: .range()
  console.log('=== TEST 1: .range(0, 9999) ===');
  const { data: range1, count: count1 } = await supabase
    .from('sheets')
    .select('id', { count: 'exact' })
    .range(0, 9999);
  console.log('Fetched:', range1?.length, 'Count header:', count1);

  // Test 2: .range() with larger number
  console.log('\n=== TEST 2: .range(0, 19999) ===');
  const { data: range2 } = await supabase
    .from('sheets')
    .select('id')
    .range(0, 19999);
  console.log('Fetched:', range2?.length);

  // Test 3: Multiple paginated queries
  console.log('\n=== TEST 3: Fetch in batches ===');
  const batch1 = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id, modified_at, created_at')
    .range(0, 999);

  const batch2 = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id, modified_at, created_at')
    .range(1000, 1999);

  console.log('Batch 1 (0-999):', batch1.data?.length);
  console.log('Batch 2 (1000-1999):', batch2.data?.length);
  console.log('Combined:', (batch1.data?.length || 0) + (batch2.data?.length || 0));

  // Test 4: Using limit with offset
  console.log('\n=== TEST 4: .limit().offset() ===');
  const { data: limitOffset } = await supabase
    .from('sheets')
    .select('id')
    .limit(2000)
    .range(0, 1999);
  console.log('Fetched:', limitOffset?.length);

  console.log('\n💡 CONCLUSION:');
  console.log('Range queries are still capped at 1000 rows.');
  console.log('We need to fetch in batches or filter by company_id BEFORE fetching.');
}

testPaginationApproaches().catch(console.error);

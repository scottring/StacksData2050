import { supabase } from './src/migration/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyDashboardFix() {
  console.log('🔍 VERIFYING DASHBOARD FIX FOR OMYA\n');

  // Get Omya user
  const { data: user } = await supabase
    .from('users')
    .select('company_id')
    .eq('email', 'abdessamad.arbaoui@omya.com')
    .single();

  const omyaCompanyId = user?.company_id!;
  console.log('Omya Company ID:', omyaCompanyId);

  // Simulate the EXACT dashboard query with range
  console.log('\n=== SIMULATING DASHBOARD QUERY (with range) ===');

  const { data: allSheets, error } = await supabase
    .from('sheets')
    .select('id, name, new_status, company_id, assigned_to_company_id, modified_at, created_at')
    .range(0, 9999);

  if (error) {
    console.error('Error fetching sheets:', error);
    return;
  }

  console.log('Total sheets fetched:', allSheets?.length);

  // Filter for Omya as SUPPLIER (assigned_to_company_id)
  const rawSupplierSheets = (allSheets || []).filter(s => s.assigned_to_company_id === omyaCompanyId);
  console.log('\nRaw supplier sheets (assigned to Omya):', rawSupplierSheets.length);

  // Deduplicate by name (EXACTLY as dashboard does)
  const supplierSheetsByName = new Map<string, any>();
  rawSupplierSheets.forEach(sheet => {
    const existing = supplierSheetsByName.get(sheet.name);
    if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
      supplierSheetsByName.set(sheet.name, sheet);
    }
  });
  const supplierSheets = Array.from(supplierSheetsByName.values());

  console.log('Deduplicated supplier sheets:', supplierSheets.length);

  // Calculate task metrics (as dashboard does)
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const supplierCompletedTasks = supplierSheets.filter(s => {
    const isStatusComplete = s.new_status === 'completed' || s.new_status === 'approved';
    const isActivelyMaintained = s.modified_at && new Date(s.modified_at) >= ninetyDaysAgo;
    return isStatusComplete || isActivelyMaintained;
  }).length;

  const supplierOpenTasks = supplierSheets.filter(s => {
    const isInProgress = s.new_status === 'in_progress' || s.new_status === 'pending';
    const isRecentlyModified = s.modified_at && new Date(s.modified_at) >= thirtyDaysAgo;
    const isActivelyMaintained = s.modified_at && new Date(s.modified_at) >= ninetyDaysAgo;
    return isInProgress || (isRecentlyModified && !isActivelyMaintained);
  }).length;

  const supplierTotalTasks = supplierSheets.length;

  console.log('\n📊 DASHBOARD METRICS (As Supplier):');
  console.log('  Total Tasks:', supplierTotalTasks);
  console.log('  Completed Tasks:', supplierCompletedTasks);
  console.log('  Open Tasks:', supplierOpenTasks);

  // Compare with customer-products page
  console.log('\n=== CUSTOMER-PRODUCTS PAGE QUERY ===');

  const { data: customerProductsSheets } = await supabase
    .from('sheets')
    .select('*')
    .eq('assigned_to_company_id', omyaCompanyId);

  const sheetsByName = new Map<string, any>();
  customerProductsSheets?.forEach(sheet => {
    const existing = sheetsByName.get(sheet.name);
    if (!existing || new Date(sheet.modified_at || sheet.created_at || 0) > new Date(existing.modified_at || existing.created_at || 0)) {
      sheetsByName.set(sheet.name, sheet);
    }
  });
  const customerProductsUnique = Array.from(sheetsByName.values());

  console.log('Customer-products page shows:', customerProductsUnique.length);

  // Final comparison
  console.log('\n✅ FINAL COMPARISON:');
  console.log('  Dashboard shows:', supplierTotalTasks, 'products');
  console.log('  Customer-products shows:', customerProductsUnique.length, 'products');

  if (supplierTotalTasks === customerProductsUnique.length) {
    console.log('\n✅ FIX VERIFIED - Numbers match!');
  } else {
    console.log('\n❌ STILL BROKEN - Numbers do NOT match');
    console.log('   Difference:', Math.abs(supplierTotalTasks - customerProductsUnique.length), 'sheets');

    // Debug: check if there's still a limit issue
    console.log('\n🔍 DEBUG INFO:');
    console.log('  Sheets fetched with range:', allSheets?.length);
    console.log('  Expected max:', 10000);

    if (allSheets && allSheets.length < 10000) {
      console.log('  ℹ️  Fetched less than 10000, which is OK if there are fewer sheets total');

      // Check total count
      const { count: totalCount } = await supabase
        .from('sheets')
        .select('*', { count: 'exact', head: true });

      console.log('  Total sheets in DB:', totalCount);

      if (allSheets.length < totalCount!) {
        console.log('  ❌ PROBLEM: Not fetching all sheets!');
      } else {
        console.log('  ✅ All sheets fetched');
      }
    }
  }
}

verifyDashboardFix().catch(console.error);

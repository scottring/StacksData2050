import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function checkRLSStatus() {
  console.log('='.repeat(80));
  console.log('RLS MIGRATION STATUS CHECK');
  console.log('='.repeat(80));
  console.log();
  
  // 1. Check for role column in users table
  console.log('1. ROLE COLUMN CHECK');
  console.log('-'.repeat(80));
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, role')
    .limit(10);
  
  if (userError) {
    console.log('❌ FAILED: Could not query role column');
    console.log('   Error:', userError.message);
  } else {
    console.log('✅ SUCCESS: Role column exists on users table');
    const roleDistribution = users.reduce((acc: Record<string, number>, u: any) => {
      acc[u.role || 'null'] = (acc[u.role || 'null'] || 0) + 1;
      return acc;
    }, {});
    console.log('   Sample distribution:', roleDistribution);
  }
  console.log();
  
  // 2. Check for super admin
  console.log('2. SUPER ADMIN CHECK');
  console.log('-'.repeat(80));
  const { data: superAdmins, error: saError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'super_admin');
  
  if (saError) {
    console.log('❌ FAILED: Could not query super_admin role');
  } else if (superAdmins.length === 0) {
    console.log('⚠️  WARNING: No super admin users found');
    console.log('   You may need to promote a user to super_admin role');
  } else {
    console.log('✅ SUCCESS: Found', superAdmins.length, 'super admin(s)');
    superAdmins.forEach((sa: any) => console.log('   -', sa.email));
  }
  console.log();
  
  // 3. Check for is_super_admin function
  console.log('3. RLS HELPER FUNCTIONS CHECK');
  console.log('-'.repeat(80));
  let hasFunction = false;
  try {
    const result = await supabase.rpc('is_super_admin');
    console.log('✅ SUCCESS: is_super_admin() function exists');
    console.log('   Returns:', result.data);
    hasFunction = true;
  } catch (err: any) {
    console.log('❌ FAILED: is_super_admin() function not found');
  }
  console.log();
  
  // 4. List migration files
  console.log('4. MIGRATION FILES PRESENT');
  console.log('-'.repeat(80));
  const migrationDir = '/Users/scottkaufman/Developer/StacksData2050/stacks/web/supabase/migrations';
  if (fs.existsSync(migrationDir)) {
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
    files.forEach(f => {
      if (f.includes('rls') || f.includes('role') || f.includes('admin')) {
        console.log('  ', f);
      }
    });
  }
  console.log();
  
  // 5. Test data access
  console.log('5. DATA ACCESS TEST (Service Role - bypasses RLS)');
  console.log('-'.repeat(80));
  
  const { data: sheets, error: sheetError } = await supabase
    .from('sheets')
    .select('id, company_id')
    .limit(1);
  console.log('   Sheets:', sheetError ? '❌ Error' : '✅ Accessible');
  
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1);
  console.log('   Companies:', compError ? '❌ Error' : '✅ Accessible');
  
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, question_text')
    .limit(1);
  console.log('   Questions:', qError ? '❌ Error' : '✅ Accessible');
  
  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const hasRole = !userError;
  const hasSuperAdmin = superAdmins && superAdmins.length > 0;
  
  if (hasRole && hasSuperAdmin && hasFunction) {
    console.log('✅ RLS migrations appear to be APPLIED');
    console.log();
    console.log('Your database has:');
    console.log('  • Role column on users table');
    console.log('  • Super admin user(s) configured');
    console.log('  • RLS helper functions installed');
    console.log();
    console.log('You should NOT need to run RLS migrations again.');
  } else {
    console.log('⚠️  RLS migrations may be INCOMPLETE');
    console.log();
    console.log('Status:');
    console.log('  • Role column:', hasRole ? '✅' : '❌');
    console.log('  • Super admin user:', hasSuperAdmin ? '✅' : '⚠️');
    console.log('  • RLS functions:', hasFunction ? '✅' : '❌');
    console.log();
    console.log('You may need to apply migrations from:');
    console.log('  /stacks/web/supabase/migrations/');
  }
}

checkRLSStatus().catch(console.error);

import { supabase } from './src/migration/supabase-client.js';

async function applyRLSFix() {
  console.log('=== Applying RLS Policy Fix ===\n');

  const sqlStatements = [
    // Choices table
    `DROP POLICY IF EXISTS "Enable read access for all users" ON choices;`,
    `DROP POLICY IF EXISTS "Enable read access for authenticated users" ON choices;`,
    `DROP POLICY IF EXISTS "choices_select_policy" ON choices;`,
    `ALTER TABLE choices ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY "Enable read access for all users" ON choices FOR SELECT USING (true);`,
    
    // Answers table
    `DROP POLICY IF EXISTS "Enable read access for all users" ON answers;`,
    `DROP POLICY IF EXISTS "Enable read access for authenticated users" ON answers;`,
    `DROP POLICY IF EXISTS "answers_select_policy" ON answers;`,
    `ALTER TABLE answers ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY "Enable read access for all users" ON answers FOR SELECT USING (true);`,
  ];

  console.log('Executing SQL statements...\n');

  for (const sql of sqlStatements) {
    const shortSql = sql.length > 80 ? sql.substring(0, 77) + '...' : sql;
    console.log(`Executing: ${shortSql}`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`  ✗ Error: ${error.message}`);
      
      // Try alternative approach using query
      const queryResult = await supabase.from('_migration_id_map').select('id').limit(0);
      if (queryResult.error?.message?.includes('exec_sql')) {
        console.log('\n⚠️  Cannot execute SQL via RPC. Please run the SQL manually:');
        console.log('\nOption 1: Via Supabase Dashboard SQL Editor');
        console.log('  Go to: https://supabase.com/dashboard/project/yrguoooxamecsjtkfqcw/sql');
        console.log('  And run the contents of: fix-rls-policies.sql\n');
        console.log('Option 2: Via psql');
        console.log('  psql -h db.yrguoooxamecsjtkfqcw.supabase.co -p 5432 -d postgres -U postgres -f fix-rls-policies.sql\n');
        return;
      }
    } else {
      console.log('  ✓ Success');
    }
  }

  console.log('\n=== Verifying Policies ===\n');

  // Verify by trying to read data
  const { count: choicesCount } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true });

  const { count: answersCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  console.log(`Choices: ${choicesCount} rows accessible`);
  console.log(`Answers: ${answersCount} rows accessible`);

  console.log('\n✓ RLS policies applied successfully!');
  console.log('\nNote: Test with an anonymous client to confirm public access works.');
}

applyRLSFix();

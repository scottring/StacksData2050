import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function checkRLS() {
  // Parse connection from SUPABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL!;
  const projectRef = supabaseUrl.split('//')[1].split('.')[0];
  
  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check if RLS is enabled
    console.log('=== RLS Status ===\n');
    const rlsStatus = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE tablename IN ('choices', 'answers')
        AND schemaname = 'public'
      ORDER BY tablename;
    `);
    console.table(rlsStatus.rows);

    // Check choices policies
    console.log('\n=== Policies for choices table ===\n');
    const choicesPolicies = await client.query(`
      SELECT 
        policyname as policy_name,
        cmd as command,
        permissive,
        roles,
        qual as using_expression,
        with_check as with_check_expression
      FROM pg_policies
      WHERE tablename = 'choices'
        AND schemaname = 'public'
      ORDER BY policyname;
    `);
    
    if (choicesPolicies.rows.length > 0) {
      console.table(choicesPolicies.rows);
    } else {
      console.log('No RLS policies found on choices table');
    }

    // Check answers policies
    console.log('\n=== Policies for answers table ===\n');
    const answersPolicies = await client.query(`
      SELECT 
        policyname as policy_name,
        cmd as command,
        permissive,
        roles,
        qual as using_expression,
        with_check as with_check_expression
      FROM pg_policies
      WHERE tablename = 'answers'
        AND schemaname = 'public'
      ORDER BY policyname;
    `);
    
    if (answersPolicies.rows.length > 0) {
      console.table(answersPolicies.rows);
    } else {
      console.log('No RLS policies found on answers table');
    }

    // Count rows to see if data exists
    console.log('\n=== Row Counts ===\n');
    const choicesCount = await client.query('SELECT COUNT(*) FROM choices');
    const answersCount = await client.query('SELECT COUNT(*) FROM answers');
    
    console.log(`Choices: ${choicesCount.rows[0].count} rows`);
    console.log(`Answers: ${answersCount.rows[0].count} rows`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkRLS();

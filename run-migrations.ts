import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigration(filename: string) {
  const path = join(__dirname, 'web/supabase/migrations', filename)
  const sql = readFileSync(path, 'utf-8')
  
  console.log(`\n=== Running ${filename} ===`)
  
  // Split by statement for execution (handle DO blocks specially)
  const { error } = await supabase.rpc('exec_sql', { sql })
  
  if (error) {
    // Try running directly if rpc doesn't exist
    console.log('RPC not available, checking table structure...')
    return false
  }
  
  console.log(`✓ ${filename} completed`)
  return true
}

async function main() {
  // Check if additional_notes column exists
  const { data: cols } = await supabase
    .from('answers')
    .select('id')
    .limit(1)
  
  // Try to select additional_notes
  const { data: test, error: testError } = await supabase
    .from('answers')
    .select('additional_notes')
    .limit(1)
  
  if (testError && testError.message.includes('additional_notes')) {
    console.log('additional_notes column does not exist yet - need to run migration')
  } else {
    console.log('✓ additional_notes column exists')
  }
  
  // Check question_comments table
  const { data: comments, error: commentsError } = await supabase
    .from('question_comments')
    .select('id')
    .limit(1)
  
  if (commentsError && commentsError.code === '42P01') {
    console.log('question_comments table does not exist yet - need to run migration')
  } else {
    console.log('✓ question_comments table exists')
  }
  
  // Check the view
  const { data: viewData, error: viewError } = await supabase
    .from('sheet_answers_display')
    .select('additional_notes, text_area_value')
    .limit(1)
  
  if (viewError && viewError.message.includes('additional_notes')) {
    console.log('sheet_answers_display view needs update for additional_notes')
  } else if (viewError && viewError.message.includes('text_area_value')) {
    console.log('sheet_answers_display view needs update for text_area_value')
  } else {
    console.log('✓ sheet_answers_display view is up to date')
  }
}

main().catch(console.error)

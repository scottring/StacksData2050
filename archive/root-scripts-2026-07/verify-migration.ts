import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { data, error } = await service
  .from('users')
  .select('id, job_title, has_logged_in')
  .limit(1)

if (error) {
  console.error('FAIL:', error.message)
  process.exit(1)
}

const { count: loggedIn } = await service
  .from('users')
  .select('id', { count: 'exact', head: true })
  .eq('has_logged_in', true)

console.log('OK. Columns present on users. has_logged_in=true count:', loggedIn)

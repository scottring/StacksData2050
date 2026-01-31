import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { count, error } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('requests table error:', error.message);
  } else {
    console.log('requests table count:', count);
  }
}

check();

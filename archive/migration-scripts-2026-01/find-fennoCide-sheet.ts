import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // Get FennoCide sheets
  const { data } = await supabase.from('sheets').select('id, name').ilike('name', '%FennoCide%').limit(5);
  console.log('FennoCide sheets:', data);

  // Get any sheet as alternative
  const { data: anySheet } = await supabase.from('sheets').select('id, name').limit(3);
  console.log('\nAlternative sheets:', anySheet);
}
main();

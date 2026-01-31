import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Count sheets with requesting_company_id set
  const { count: withRequesting } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .not('requesting_company_id', 'is', null);
  
  console.log('Sheets WITH requesting_company_id:', withRequesting);

  // Count sheets without requesting_company_id
  const { count: withoutRequesting } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .is('requesting_company_id', null);
  
  console.log('Sheets WITHOUT requesting_company_id:', withoutRequesting);

  // Check UPM company
  const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';
  
  const { data: upmCompany } = await supabase
    .from('companies')
    .select('*')
    .eq('id', UPM_ID)
    .single();
  
  console.log('\nUPM Company record:', upmCompany);

  // Look for "UPM" in any sheet name
  const { data: upmSheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, requesting_company_id')
    .ilike('name', '%upm%')
    .limit(5);
  
  console.log('\nSheets with "UPM" in name:', upmSheets);
}

check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';

  // Total sheets
  const { count: total } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true });
  console.log('Total unique sheets:', total);

  // Sheets with requesting_company_id
  const { count: withReq } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .not('requesting_company_id', 'is', null);
  console.log('Sheets with requesting_company_id:', withReq);

  // UPM as customer
  const { count: upmCustomer } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('requesting_company_id', UPM_ID);
  console.log('UPM as customer (requesting_company_id):', upmCustomer);

  // Sample UPM sheets
  const { data: sampleUpm } = await supabase
    .from('sheets')
    .select('id, name, company_id, requesting_company_id')
    .eq('requesting_company_id', UPM_ID)
    .limit(10);
  
  // Get supplier names
  const companyIds = sampleUpm?.map(s => s.company_id).filter(Boolean) || [];
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .in('id', companyIds);
  
  const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);
  
  console.log('\nSample UPM sheets (as customer):');
  sampleUpm?.forEach(s => {
    console.log('  ' + s.name + ' - from ' + (companyMap.get(s.company_id) || 'Unknown'));
  });
}

verify();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRLS() {
  // Query the pg_policies view directly
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'sheets');

  if (error) {
    console.log('Error querying pg_policies:', error.message);
    console.log('Trying alternative method...');
  } else {
    console.log('Sheets policies:', data);
  }

  // Check what Kaisa sees as a UPM user
  const KAISA_ID = '3ed3110d-990b-402e-912a-17095cbeb7ef';
  const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';

  // Count all sheets
  const { count: totalSheets } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true });
  
  console.log('\nTotal sheets in database:', totalSheets);

  // Count UPM sheets (as supplier - company_id)
  const { count: upmSupplier } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', UPM_ID);
  
  console.log('UPM sheets (as supplier/company_id):', upmSupplier);

  // Count UPM sheets (as customer - requesting_company_id)  
  const { count: upmCustomer } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('requesting_company_id', UPM_ID);
  
  console.log('UPM sheets (as customer/requesting_company_id):', upmCustomer);

  // What Kaisa SHOULD see
  const { count: kaisaShould } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .or('company_id.eq.' + UPM_ID + ',requesting_company_id.eq.' + UPM_ID);
  
  console.log('Sheets Kaisa SHOULD see (UPM as supplier OR customer):', kaisaShould);
}

checkRLS();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Get all companies with sheet counts
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name');

  console.log('Companies with sheets:\n');
  
  for (const company of companies || []) {
    const { count: asSupplier } = await supabase
      .from('sheets')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id);
    
    const { count: asCustomer } = await supabase
      .from('sheets')
      .select('*', { count: 'exact', head: true })
      .eq('requesting_company_id', company.id);
    
    if ((asSupplier || 0) > 0 || (asCustomer || 0) > 0) {
      console.log(company.name + ' (' + company.id.slice(0,8) + '...):');
      console.log('  As supplier: ' + asSupplier);
      console.log('  As customer: ' + asCustomer);
    }
  }

  // Check if UPM exists
  const { data: upm } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', '%upm%');
  
  console.log('\nUPM companies found:', upm);

  // Sample some sheets to see their company assignments
  const { data: sampleSheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, requesting_company_id')
    .limit(5);
  
  console.log('\nSample sheets:', sampleSheets);
}

check();

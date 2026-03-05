import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Find Scott's user record
  const { data: scott } = await supabase
    .from('users')
    .select('id, email, company_id, role')
    .eq('email', 'scott.kaufman@stacksdata.com')
    .single();
  console.log('Scott:', scott);

  // Find sheets that are canonical AND accessible
  // Check if RLS is even on for sheets
  const UPM_ID = '86db93bf-9c1d-467a-9a2b-4625a5dbaaf1';
  const SAPPI_ID = '9567b9ac-1c12-457f-8e49-321519c267b3';

  // Find sheets where company_id matches Scott's company OR requesting_company matches
  if (scott?.company_id) {
    const { data: mySheets, count } = await supabase
      .from('sheets')
      .select('id, name, company_id, requesting_company_id', { count: 'exact' })
      .eq('company_id', scott.company_id)
      .limit(3);
    console.log(`\nSheets where company_id = Scott's company: ${count}`);
    mySheets?.forEach(s => console.log(`  ${s.id} | ${s.name} | req: ${s.requesting_company_id}`));

    // Find canonical ones
    const { data: canonicalSheets, count: cc } = await supabase
      .from('sheets')
      .select('id, name, company_id, requesting_company_id', { count: 'exact' })
      .eq('company_id', scott.company_id)
      .in('requesting_company_id', [UPM_ID, SAPPI_ID])
      .limit(5);
    console.log(`\nCanonical sheets for Scott's company: ${cc}`);
    canonicalSheets?.forEach(s => console.log(`  ${s.id} | ${s.name} | req: ${s.requesting_company_id}`));
  }

  // Also check: which supplier companies have the most canonical sheets?
  const { data: topSuppliers } = await supabase
    .from('sheets')
    .select('company_id, companies!sheets_company_id_fkey(name)')
    .in('requesting_company_id', [UPM_ID, SAPPI_ID])
    .limit(500);

  const supplierCounts: Record<string, { name: string; count: number }> = {};
  topSuppliers?.forEach(s => {
    const name = (s as any).companies?.name || s.company_id;
    if (!supplierCounts[s.company_id]) supplierCounts[s.company_id] = { name, count: 0 };
    supplierCounts[s.company_id].count++;
  });

  console.log('\nTop suppliers with canonical sheets:');
  Object.entries(supplierCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([id, { name, count }]) => console.log(`  ${id} | ${name} | ${count} sheets`));
}

main().catch(err => { console.error(err); process.exit(1); });

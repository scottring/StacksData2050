import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check for test users
  const emails = ['smkaufman+supplier@gmail.com', 'smkaufman_manuf@gmail.com'];
  
  console.log('=== Checking users ===');
  for (const email of emails) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name, company_id, companies(name)')
      .eq('email', email)
      .single();
    
    if (user) {
      console.log(`\n✓ ${email}`);
      console.log(`  Name: ${user.full_name}`);
      console.log(`  Company: ${(user as any).companies?.name} (${user.company_id})`);
    } else {
      console.log(`\n✗ ${email} - NOT FOUND`);
    }
  }

  // Check test companies
  console.log('\n=== Test Companies ===');
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .or('name.ilike.%test%,name.ilike.%manuf%,name.ilike.%supplier%');
  
  companies?.forEach(c => console.log(`  ${c.name} → ${c.id}`));
}

main().catch(console.error);

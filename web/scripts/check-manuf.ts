import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check users for Test Manufacturer Co
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('company_id', '5ed564fa-c754-4110-a901-81a916225cb3');
  
  console.log('Users in 🧪 Test Manufacturer Co:');
  if (users?.length) {
    users.forEach(u => console.log(`  ${u.email} (${u.full_name})`));
  } else {
    console.log('  (none)');
  }
}

main().catch(console.error);

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Check the e2e user
  console.log('=== E2E User ===');
  const { data: user } = await supabase
    .from('users')
    .select('id, email, company_id, full_name')
    .eq('email', 'smkaufman+e2e@gmail.com')
    .single();
  console.log(user);

  if (user) {
    // 2. Check the company
    console.log('\n=== User Company ===');
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.company_id)
      .single();
    console.log(company);
  }

  // 3. Check recent requests
  console.log('\n=== Recent Requests (last 5) ===');
  const { data: requests } = await supabase
    .from('requests')
    .select('id, requestor_id, requesting_from_id, sheet_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  requests?.forEach(r => {
    console.log();
    console.log();
    console.log();
    console.log();
  });

  // 4. Check if user's company matches any request's requesting_from_id
  if (user) {
    console.log('\n=== Requests TO user company ===');
    const { data: incomingRequests } = await supabase
      .from('requests')
      .select('id, sheet_id, sheets(name)')
      .eq('requesting_from_id', user.company_id);
    console.log(incomingRequests?.length || 0, 'requests found');
    incomingRequests?.forEach(r => console.log());
  }

  // 5. Check recent invitations
  console.log('\n=== Recent Invitations ===');
  const { data: invites } = await supabase
    .from('invitations')
    .select('id, email, company_id, request_id, accepted_at')
    .order('created_at', { ascending: false })
    .limit(3);
  invites?.forEach(i => {
    console.log();
    console.log();
    console.log();
    console.log();
  });
}

main().catch(console.error);

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invites } = await supabase
    .from("invitations")
    .select("*")
    .ilike("email", "%e2e%")
    .order("created_at", { ascending: false });
  
  console.log(JSON.stringify(invites, null, 2));
}
main().catch(console.error);

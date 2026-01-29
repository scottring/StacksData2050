import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fix the e2e user - link to the company that the request points to
  const correctCompanyId = "71d1e226-8b4a-4668-9810-76b099dbeaf5";
  
  const { error } = await supabase
    .from("users")
    .update({ company_id: correctCompanyId })
    .eq("email", "smkaufman+e2e@gmail.com");
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Fixed! User now linked to correct company.");
  }
}
main().catch(console.error);

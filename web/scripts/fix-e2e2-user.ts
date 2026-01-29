import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check current user state
  const { data: user } = await supabase
    .from("users")
    .select("id, email, company_id")
    .eq("email", "smkaufman+e2e2@gmail.com")
    .single();
  
  console.log("Current user:", user);

  // The request points to this company
  const correctCompanyId = "09daf531-2a54-4206-bfeb-492b8518ac9d";
  
  if (user) {
    const { error } = await supabase
      .from("users")
      .update({ company_id: correctCompanyId })
      .eq("email", "smkaufman+e2e2@gmail.com");
    
    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Fixed! User now linked to company:", correctCompanyId);
    }
  } else {
    console.log("User not found - may not have signed up yet");
  }
}
main().catch(console.error);

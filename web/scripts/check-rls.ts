import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check the sheet's company_id vs user's company_id
  const sheetId = "d5cbbbbb-a309-491a-b5ca-f90cd63a975f";
  const userEmail = "smkaufman+e2e2@gmail.com";
  
  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, company_id, requesting_company_id")
    .eq("id", sheetId)
    .single();
  
  const { data: user } = await supabase
    .from("users")
    .select("id, company_id")
    .eq("email", userEmail)
    .single();
  
  console.log("Sheet:");
  console.log("  company_id (owner):", sheet?.company_id);
  console.log("  requesting_company_id (supplier):", sheet?.requesting_company_id);
  
  console.log("\nUser:");
  console.log("  company_id:", user?.company_id);
  
  console.log("\nAccess check:");
  console.log("  User is owner:", sheet?.company_id === user?.company_id);
  console.log("  User is supplier:", sheet?.requesting_company_id === user?.company_id);
}
main().catch(console.error);

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find sheet named E2E Test Product
  console.log("=== E2E Sheets ===");
  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, name, company_id, requesting_company_id, status")
    .ilike("name", "%E2E%");
  
  for (const s of sheets || []) {
    console.log("Sheet:", s.name);
    console.log("  id:", s.id);
    console.log("  company_id (owner):", s.company_id);
    console.log("  requesting_company_id (supplier):", s.requesting_company_id);
    console.log("  status:", s.status);
    
    // Check request for this sheet
    const { data: req } = await supabase
      .from("requests")
      .select("id, requestor_id, requesting_from_id")
      .eq("sheet_id", s.id)
      .single();
    if (req) {
      console.log("  Request requestor_id:", req.requestor_id);
      console.log("  Request requesting_from_id:", req.requesting_from_id);
    }
  }

  // User company
  console.log("\n=== E2E User Company ===");
  console.log("878e09ce-8ad3-47a5-bbd3-c00bb2302f14");

  // Check if there's a mismatch
  console.log("\n=== Company Name Check ===");
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .or("name.ilike.%E2E%,name.ilike.%Invited%");
  companies?.forEach(c => console.log(c.id, "-", c.name));
}
main().catch(console.error);

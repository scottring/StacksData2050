import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find all E2E/test sheets
  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, name")
    .or("name.ilike.%e2e%,name.ilike.%test%");
  
  console.log("Found sheets to delete:", sheets?.map(s => s.name));
  
  const sheetIds = sheets?.map(s => s.id) || [];
  
  if (sheetIds.length > 0) {
    // Delete answers for these sheets
    const { error: ansErr } = await supabase.from("answers").delete().in("sheet_id", sheetIds);
    console.log("Deleted answers:", ansErr ? ansErr.message : "OK");
    
    // Delete sheet_tags
    const { error: stErr } = await supabase.from("sheet_tags").delete().in("sheet_id", sheetIds);
    console.log("Deleted sheet_tags:", stErr ? stErr.message : "OK");
    
    // Delete sheet_statuses
    const { error: ssErr } = await supabase.from("sheet_statuses").delete().in("sheet_id", sheetIds);
    console.log("Deleted sheet_statuses:", ssErr ? ssErr.message : "OK");
    
    // Delete requests for these sheets
    const { data: requests } = await supabase.from("requests").select("id").in("sheet_id", sheetIds);
    const requestIds = requests?.map(r => r.id) || [];
    
    if (requestIds.length > 0) {
      // Delete request_tags
      const { error: rtErr } = await supabase.from("request_tags").delete().in("request_id", requestIds);
      console.log("Deleted request_tags:", rtErr ? rtErr.message : "OK");
      
      // Delete requests
      const { error: reqErr } = await supabase.from("requests").delete().in("sheet_id", sheetIds);
      console.log("Deleted requests:", reqErr ? reqErr.message : "OK");
    }
    
    // Delete sheets
    const { error: shErr } = await supabase.from("sheets").delete().in("id", sheetIds);
    console.log("Deleted sheets:", shErr ? shErr.message : "OK");
  }
  
  // Delete test invitations
  const { error: invErr } = await supabase.from("invitations").delete().ilike("email", "%e2e%");
  console.log("Deleted e2e invitations:", invErr ? invErr.message : "OK");
  
  // Delete test companies (but not the main Test Manufacturer/Supplier)
  const { error: compErr } = await supabase
    .from("companies")
    .delete()
    .or("name.ilike.%e2e%,name.ilike.%Invited:%")
    .not("name", "ilike", "%Test Manufacturer%")
    .not("name", "ilike", "%Test Supplier%");
  console.log("Deleted test companies:", compErr ? compErr.message : "OK");
  
  console.log("\n✅ Test data cleared!");
}
main().catch(console.error);

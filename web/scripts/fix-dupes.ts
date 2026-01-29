import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find duplicate companies by name
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, created_at")
    .order("created_at");
  
  const nameGroups = new Map<string, any[]>();
  companies?.forEach(c => {
    const name = c.name?.toLowerCase() || '';
    if (!nameGroups.has(name)) nameGroups.set(name, []);
    nameGroups.get(name)!.push(c);
  });
  
  // Process duplicates
  for (const [name, group] of nameGroups) {
    if (group.length <= 1) continue;
    
    console.log(`\n=== "${name}" (${group.length} copies) ===`);
    
    // Keep the oldest (first created)
    const keepId = group[0].id;
    const deleteIds = group.slice(1).map(c => c.id);
    
    console.log(`  Keeping: ${keepId}`);
    console.log(`  Deleting: ${deleteIds.join(', ')}`);
    
    // Move users from duplicates to the keeper
    for (const deleteId of deleteIds) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email")
        .eq("company_id", deleteId);
      
      if (users && users.length > 0) {
        console.log(`  Moving ${users.length} users from ${deleteId} to ${keepId}`);
        await supabase
          .from("users")
          .update({ company_id: keepId })
          .eq("company_id", deleteId);
      }
      
      // Now delete the duplicate
      const { error } = await supabase.from("companies").delete().eq("id", deleteId);
      if (error) {
        console.log(`  Error deleting: ${error.message}`);
      } else {
        console.log(`  Deleted ${deleteId}`);
      }
    }
  }
  
  console.log("\n✅ Done!");
}
main().catch(console.error);

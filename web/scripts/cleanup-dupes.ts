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
    .select("id, name")
    .order("name");
  
  const nameCount = new Map<string, string[]>();
  companies?.forEach(c => {
    const name = c.name?.toLowerCase() || '';
    if (!nameCount.has(name)) nameCount.set(name, []);
    nameCount.get(name)!.push(c.id);
  });
  
  // Find duplicates
  const duplicates: string[] = [];
  nameCount.forEach((ids, name) => {
    if (ids.length > 1) {
      console.log(`Duplicate: "${name}" has ${ids.length} entries`);
      // Keep first, mark rest for deletion
      duplicates.push(...ids.slice(1));
    }
  });
  
  if (duplicates.length === 0) {
    console.log("No duplicates found");
    return;
  }
  
  console.log(`\nWill delete ${duplicates.length} duplicate companies...`);
  
  // Check if any have users
  for (const id of duplicates) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .eq("company_id", id);
    
    if (users && users.length > 0) {
      console.log(`  Company ${id} has ${users.length} users - skipping`);
      continue;
    }
    
    // Safe to delete
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      console.log(`  Error deleting ${id}: ${error.message}`);
    } else {
      console.log(`  Deleted ${id}`);
    }
  }
  
  console.log("\n✅ Cleanup complete!");
}
main().catch(console.error);

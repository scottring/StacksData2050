import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sheetId = "d5cbbbbb-a309-491a-b5ca-f90cd63a975f";
  
  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, name, status, modified_at")
    .eq("id", sheetId)
    .single();
  
  console.log("Sheet:", sheet);
}
main().catch(console.error);

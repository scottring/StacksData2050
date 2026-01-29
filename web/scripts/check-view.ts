import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sheetId = "d5cbbbbb-a309-491a-b5ca-f90cd63a975f";
  
  // Query the view directly
  console.log("=== sheet_answers_display view ===");
  const { data, error } = await supabase
    .from("sheet_answers_display")
    .select("*")
    .eq("sheet_id", sheetId);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Rows returned:", data?.length || 0);
  data?.forEach(a => {
    console.log(`Q: ${a.question_id?.slice(0,8)}... | text: ${a.text_value || '(null)'} | choice: ${a.choice_id || '(null)'}`);
  });
}
main().catch(console.error);

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check answers for the e2e test sheet
  const sheetId = "d5cbbbbb-a309-491a-b5ca-f90cd63a975f";
  
  const { data: answers, error } = await supabase
    .from("answers")
    .select("id, question_id, text_value, choice_id, created_at, modified_at")
    .eq("sheet_id", sheetId);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Answers for sheet:", answers?.length || 0);
  answers?.forEach(a => {
    console.log(`\nQuestion: ${a.question_id}`);
    console.log(`  text_value: ${a.text_value?.slice(0, 100) || '(null)'}`);
    console.log(`  choice_id: ${a.choice_id || '(null)'}`);
    console.log(`  modified: ${a.modified_at}`);
  });
}
main().catch(console.error);

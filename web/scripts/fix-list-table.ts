import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sheetId = "d5cbbbbb-a309-491a-b5ca-f90cd63a975f";
  const listTableQuestionId = "51a8aa66-75ec-46b6-9571-86172cb5b4ef";
  
  // Delete all answers for this list table question
  const { error } = await supabase
    .from("answers")
    .delete()
    .eq("sheet_id", sheetId)
    .eq("question_id", listTableQuestionId);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Cleared list table answers. Refresh and re-enter data.");
  }
}
main().catch(console.error);

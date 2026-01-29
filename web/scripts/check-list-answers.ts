import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sheetId = "292f258a-8790-40ff-875f-cb004cae516b";
  const listTableQuestionId = "51a8aa66-75ec-46b6-9571-86172cb5b4ef";
  
  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("sheet_id", sheetId)
    .eq("question_id", listTableQuestionId);
  
  console.log("List table answers:", answers?.length || 0);
  answers?.forEach(a => {
    console.log(`  row: ${a.list_table_row_id} col: ${a.list_table_column_id} val: ${a.text_value}`);
  });
}
main().catch(console.error);

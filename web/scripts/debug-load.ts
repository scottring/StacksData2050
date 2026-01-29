import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sheetId = "d5cbbbbb-a309-491a-b5ca-f90cd63a975f";
  
  // Get sheet tags
  console.log("=== Sheet Tags ===");
  const { data: sheetTags } = await supabase
    .from("sheet_tags")
    .select("tag_id, tags(name)")
    .eq("sheet_id", sheetId);
  console.log(sheetTags);

  // Get questions for those tags
  if (sheetTags && sheetTags.length > 0) {
    const tagIds = sheetTags.map(st => st.tag_id);
    console.log("\n=== Questions for these tags ===");
    const { data: questionTags } = await supabase
      .from("question_tags")
      .select("question_id, questions(id, content, response_type)")
      .in("tag_id", tagIds);
    
    questionTags?.forEach(qt => {
      const q = (qt as any).questions;
      console.log(`Q: ${q?.id?.slice(0,8)}... | ${q?.response_type} | ${q?.content?.slice(0,40)}`);
    });
  }

  // Get answers
  console.log("\n=== Answers in DB ===");
  const { data: answers } = await supabase
    .from("answers")
    .select("question_id, text_value, choice_id")
    .eq("sheet_id", sheetId);
  answers?.forEach(a => {
    console.log(`A: ${a.question_id?.slice(0,8)}... | text: ${a.text_value || '(null)'} | choice: ${a.choice_id || '(null)'}`);
  });
}
main().catch(console.error);

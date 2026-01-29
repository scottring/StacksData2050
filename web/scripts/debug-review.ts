import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get sheet ID from URL
  const sheetId = "292f258a-8790-40ff-875f-cb004cae516b";
  
  // Check sheet
  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, name, status")
    .eq("id", sheetId)
    .single();
  console.log("Sheet:", sheet);
  
  // Check sheet_tags
  const { data: sheetTags } = await supabase
    .from("sheet_tags")
    .select("tag_id, tags(name)")
    .eq("sheet_id", sheetId);
  console.log("\nSheet tags:", sheetTags);
  
  if (sheetTags && sheetTags.length > 0) {
    const tagIds = sheetTags.map(st => st.tag_id);
    
    // Check question_tags
    const { data: questionTags } = await supabase
      .from("question_tags")
      .select("question_id")
      .in("tag_id", tagIds);
    console.log("\nQuestions with these tags:", questionTags?.length || 0);
    
    if (questionTags && questionTags.length > 0) {
      // Check the questions
      const qIds = questionTags.map(qt => qt.question_id);
      const { data: questions } = await supabase
        .from("questions")
        .select("id, content, parent_section_id, parent_subsection_id, subsection_id")
        .in("id", qIds);
      console.log("\nSample questions:");
      questions?.slice(0, 3).forEach(q => {
        console.log(`  ${q.id.slice(0,8)}... parent_section:${q.parent_section_id} parent_sub:${q.parent_subsection_id} subsection:${q.subsection_id}`);
      });
    }
  }
  
  // Check answers
  const { data: answers } = await supabase
    .from("answers")
    .select("id, question_id, text_value")
    .eq("sheet_id", sheetId);
  console.log("\nAnswers:", answers?.length || 0);
}
main().catch(console.error);

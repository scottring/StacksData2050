import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get e2e tagged questions
  const { data: questionTags } = await supabase
    .from("question_tags")
    .select("question_id")
    .eq("tag_id", "c21b02b7-52f7-428c-868c-6b8aeb57ba65");
  
  const qIds = questionTags?.map(qt => qt.question_id) || [];
  
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .in("id", qIds);
  
  questions?.forEach(q => {
    console.log("\nQuestion:", q.id);
    console.log("  content:", q.content?.slice(0, 50));
    console.log("  subsection_id:", q.subsection_id);
    console.log("  parent_section_id:", q.parent_section_id);
    console.log("  parent_subsection_id:", q.parent_subsection_id);
    console.log("  section_sort_number:", q.section_sort_number);
  });
}
main().catch(console.error);

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase.from('questions').select('id, response_type, content, subsection_id');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Found', data?.length, 'questions');
  const byType: Record<string, any[]> = {};
  data?.forEach(q => {
    const t = q.response_type || 'null';
    if (!byType[t]) byType[t] = [];
    byType[t].push(q);
  });
  Object.keys(byType).sort().forEach(t => {
    console.log(`\n=== ${t} (${byType[t].length}) ===`);
    byType[t].slice(0,2).forEach(q => console.log(`  ${q.id.slice(0,8)}... ${(q.content || '').slice(0,50)}`));
  });
}
main().catch(console.error);

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const lines = fs.readFileSync(".env.local", "utf-8").split("\n");
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  process.env[trimmed.slice(0, eqIdx).trim()] ||= trimmed.slice(eqIdx + 1).trim();
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: choices } = await supabase.from("choices").select("id, question_id, content").not("question_id", "is", null).order("id");
console.log(`Total choices: ${choices.length}`);

// Find duplicates: group by question_id+content
const groups = {};
for (const c of choices) {
  const key = `${c.question_id}|${c.content}`;
  groups[key] = groups[key] || [];
  groups[key].push(c.id);
}

// Build map: dupe_id -> keep_id
const remapIds = {};
const toDelete = [];
for (const ids of Object.values(groups)) {
  if (ids.length > 1) {
    const [keep, ...dupes] = ids;
    for (const d of dupes) {
      remapIds[d] = keep;
      toDelete.push(d);
    }
  }
}
console.log(`Duplicates to delete: ${toDelete.length}`);

// Update answers that reference dupes
for (const [dupeId, keepId] of Object.entries(remapIds)) {
  await supabase.from("answers").update({ choice_id: keepId }).eq("choice_id", dupeId);
}
console.log("Answers remapped");

// Delete dupes in batches of 20
for (let i = 0; i < toDelete.length; i += 20) {
  const batch = toDelete.slice(i, i + 20);
  await supabase.from("choices").delete().in("id", batch);
}
console.log("Duplicates deleted");

// Delete orphaned
const { data: orphaned } = await supabase.from("choices").delete().is("question_id", null).select("id");
console.log(`Orphaned deleted: ${orphaned?.length || 0}`);

const { count } = await supabase.from("choices").select("id", { count: "exact", head: true });
console.log(`Final count: ${count}`);

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

// Standard order for common choices
const orderMap = {
  "yes": 1,
  "no": 2,
  "not assessed": 3,
  "not applicable": 4,
};

const { data: choices } = await supabase.from("choices").select("id, content, order_number");
console.log(`Total choices: ${choices.length}`);

let updated = 0;
for (const c of choices) {
  const content = (c.content || "").toLowerCase().trim();
  const newOrder = orderMap[content];
  if (newOrder && newOrder !== c.order_number) {
    await supabase.from("choices").update({ order_number: newOrder }).eq("id", c.id);
    updated++;
  }
}

console.log(`Updated order for ${updated} choices`);
console.log("Done!");

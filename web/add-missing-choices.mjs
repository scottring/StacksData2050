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

// Get all questions with Select/Radio type
const { data: questions } = await supabase
  .from("questions")
  .select("id, name, response_type")
  .or("response_type.ilike.%select%,response_type.ilike.%radio%,response_type.ilike.%dropdown%,response_type.ilike.%choice%");

console.log(`Found ${questions.length} select/radio/choice questions`);

// Standard choices for Yes/No questions
const standardChoices = [
  { content: "Yes", order_number: 1 },
  { content: "No", order_number: 2 },
  { content: "Not assessed", order_number: 3 },
  { content: "Not applicable", order_number: 4 },
];

let added = 0;
for (const q of questions) {
  // Check if question has choices
  const { data: existing } = await supabase
    .from("choices")
    .select("id")
    .eq("question_id", q.id);
  
  if (existing && existing.length > 0) continue; // Already has choices
  
  // Add standard choices
  const toInsert = standardChoices.map(c => ({
    question_id: q.id,
    content: c.content,
    order_number: c.order_number,
  }));
  
  const { error } = await supabase.from("choices").insert(toInsert);
  if (error) {
    console.error(`Failed for ${q.id}: ${error.message}`);
  } else {
    console.log(`Added choices to: ${q.name.substring(0, 50)}...`);
    added++;
  }
}

console.log(`\nAdded choices to ${added} questions`);

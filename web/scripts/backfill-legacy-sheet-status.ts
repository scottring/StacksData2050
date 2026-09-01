/**
 * Backfill real statuses onto legacy (pre-rebuild) sheets.
 *
 * Why this exists
 * ---------------
 * The Bubble migration blanket-assigned status='completed' to every imported
 * sheet, because Bubble had no sheet status field to map from. UPM noticed:
 * sheets that were never finished still show "Completed". Nothing on the row
 * supported the claim -- submitted_at and approved_at were both null.
 *
 * Source of truth
 * ---------------
 * Bubble DID record human intent, as a version lock:
 *   Version Lock + Version Close Date + Version Closed by
 * A named person closing a version on a date is a real "this is finished"
 * signal. We use it in preference to counting answers, which is only a proxy
 * and disagrees with the recorded intent on about a third of rows.
 *
 * Rule applied (per legacy sheet, keyed by bubble_id):
 *   closed in Bubble  AND answered > 0  -> completed, submitted_at = close date
 *   closed in Bubble  AND answered = 0  -> pending      (closed but empty)
 *   not closed        AND answered = 0  -> pending
 *   not closed        AND answered > 0  -> in_progress
 *
 * Output is SQL, not direct writes: the prod service-role key in
 * .env.production is currently rejected, and an emitted script is auditable
 * and re-runnable. Apply with:
 *   npx supabase db query --linked -f <emitted file>
 *
 * Usage (from stacks/web):
 *   npx tsx scripts/backfill-legacy-sheet-status.ts --company UPM
 *   npx tsx scripts/backfill-legacy-sheet-status.ts --all
 *   npx tsx scripts/backfill-legacy-sheet-status.ts --company UPM --emit out.sql
 *
 * Idempotent: re-running against already-corrected data produces the same
 * target statuses, so applying the SQL twice is harmless.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";

const BUBBLE_EXPORT = join(__dirname, "../../fresh-import/bubble-export/sheet.json");
const STACKS_DIR = join(__dirname, "../..");

type BubbleSheet = {
  _id: string;
  Name?: string;
  "Version Lock"?: boolean;
  "Version Close Date"?: string;
  "Version Closed by"?: string;
};

type LegacyRow = {
  id: string;
  bubble_id: string | null;
  name: string;
  company: string | null;
  answered: number;
};

type Target = "completed" | "pending" | "in_progress";

/** Run a read-only query against the linked (production) project via the CLI. */
function query<T>(sql: string): T[] {
  const raw = execFileSync(
    "npx",
    ["supabase", "db", "query", "--linked", sql.replace(/\s+/g, " ").trim()],
    { cwd: STACKS_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  const start = raw.indexOf("{");
  if (start === -1) throw new Error(`No JSON in CLI output:\n${raw}`);
  const parsed = JSON.parse(raw.slice(start));
  if (parsed._tag === "Error") throw new Error(JSON.stringify(parsed.error));
  return parsed.rows as T[];
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Decide the true status for one legacy sheet.
 * Exported shape kept pure so the rule can be reasoned about on its own.
 */
export function decideStatus(closedAt: string | null, answered: number): Target {
  if (closedAt && answered > 0) return "completed";
  return answered > 0 ? "in_progress" : "pending";
}

function main() {
  const argv = process.argv.slice(2);
  const all = argv.includes("--all");
  const companyIdx = argv.indexOf("--company");
  const company = companyIdx !== -1 ? argv[companyIdx + 1] : undefined;
  const emitIdx = argv.indexOf("--emit");
  const emitPath = emitIdx !== -1 ? argv[emitIdx + 1] : undefined;

  if (!all && !company) {
    console.error("Specify --company <name> or --all");
    process.exit(1);
  }

  // 1. Human intent, from the original Bubble export.
  const bubble: BubbleSheet[] = JSON.parse(readFileSync(BUBBLE_EXPORT, "utf8"));
  const closedAtById = new Map<string, string>();
  for (const row of bubble) {
    const closed = row["Version Close Date"];
    if (closed) closedAtById.set(row._id, closed);
  }
  console.log(`Bubble export: ${bubble.length} sheets, ${closedAtById.size} closed by a person\n`);

  // 2. Current legacy rows in production, with distinct-question answer coverage.
  //    Answer ROWS overcount (list tables emit many rows per question), so we
  //    count distinct question_id that carries a real value.
  const scope = all
    ? "true"
    : `c.name = ${sqlString(company!)}`;
  const rows = query<LegacyRow>(`
    with legacy as (
      select s.id, s.bubble_id, s.name, c.name as company
      from sheets s
      left join companies c on c.id = s.requesting_company_id
      where s.import_source is null
        and s.status = 'completed'
        and ${scope}
    )
    select l.id, l.bubble_id, l.name, l.company,
      count(distinct a.question_id) filter (where
        coalesce(nullif(btrim(a.text_value), ''), nullif(btrim(a.text_area_value), '')) is not null
        or a.number_value is not null
        or a.boolean_value is not null
        or a.date_value is not null
        or a.choice_id is not null) as answered
    from legacy l
    left join answers a on a.sheet_id = l.id
    group by l.id, l.bubble_id, l.name, l.company
  `);

  if (rows.length === 0) {
    console.log("No legacy sheets matched. Nothing to do.");
    return;
  }

  // 3. Decide, and report before writing anything.
  const decided = rows.map((row) => {
    const closedAt = row.bubble_id ? closedAtById.get(row.bubble_id) ?? null : null;
    const answered = Number(row.answered);
    return { ...row, answered, closedAt, target: decideStatus(closedAt, answered) };
  });

  const unmatched = decided.filter((d) => !d.bubble_id || !closedAtById.has(d.bubble_id!));
  const tally = decided.reduce<Record<string, number>>((acc, d) => {
    acc[d.target] = (acc[d.target] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Legacy sheets in scope: ${decided.length}`);
  console.log(`  -> completed   ${tally.completed ?? 0}  (closed in Bubble, has answers)`);
  console.log(`  -> in_progress ${tally.in_progress ?? 0}  (never closed, partially answered)`);
  console.log(`  -> pending     ${tally.pending ?? 0}  (no answers)`);
  console.log(`  unchanged from 'completed': ${tally.completed ?? 0} of ${decided.length}`);
  console.log(`  no Bubble close record: ${unmatched.length}`);

  const closedButEmpty = decided.filter((d) => d.closedAt && d.answered === 0);
  if (closedButEmpty.length) {
    console.log(`\n  NOTE: ${closedButEmpty.length} sheet(s) closed by a person but hold zero answers.`);
    console.log(`  Treated as 'pending' -- a Completed badge over an empty sheet is the`);
    console.log(`  exact problem being fixed here. Listed:`);
    for (const d of closedButEmpty) console.log(`    ${d.company} / ${d.name}`);
  }

  const byCompany = decided.reduce<Record<string, Record<string, number>>>((acc, d) => {
    const key = d.company ?? "(no company)";
    acc[key] = acc[key] ?? {};
    acc[key][d.target] = (acc[key][d.target] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\nBy company:");
  for (const [name, counts] of Object.entries(byCompany)) {
    console.log(
      `  ${name.padEnd(24)} completed ${String(counts.completed ?? 0).padStart(4)}` +
        `  in_progress ${String(counts.in_progress ?? 0).padStart(4)}` +
        `  pending ${String(counts.pending ?? 0).padStart(4)}`
    );
  }

  // 4. Emit idempotent SQL. Each sheet is set explicitly to its decided status,
  //    so re-applying converges rather than drifting.
  const values = decided
    .map((d) => {
      const submitted = d.target === "completed" && d.closedAt ? sqlString(d.closedAt) : "null";
      return `    (${sqlString(d.id)}::uuid, ${sqlString(d.target)}, ${submitted}::timestamptz)`;
    })
    .join(",\n");

  const sql = `-- Legacy sheet status backfill
-- Generated ${new Date().toISOString()} by scripts/backfill-legacy-sheet-status.ts
-- Scope: ${all ? "all companies" : company}
-- Sheets: ${decided.length} (completed ${tally.completed ?? 0}, in_progress ${
    tally.in_progress ?? 0
  }, pending ${tally.pending ?? 0})
--
-- Source of truth is the Bubble "Version Close Date" lock, not answer counts.
-- Idempotent: sets each sheet to an explicit target status.

begin;

with target(sheet_id, status, submitted_at) as (
  values
${values}
)
update sheets s
   set status       = t.status,
       submitted_at = coalesce(t.submitted_at, s.submitted_at),
       modified_at  = now()
  from target t
 where s.id = t.sheet_id
   and (s.status is distinct from t.status
        or (t.submitted_at is not null and s.submitted_at is null));

commit;
`;

  const outPath = emitPath ?? join(__dirname, "legacy-sheet-status.generated.sql");
  writeFileSync(outPath, sql);
  console.log(`\nSQL written to ${outPath}`);
  console.log(`Review it, then apply with:`);
  console.log(`  cd ${STACKS_DIR} && npx supabase db query --linked -f ${outPath}`);
  console.log(`\nNothing has been written to the database by this script.`);
}

main();

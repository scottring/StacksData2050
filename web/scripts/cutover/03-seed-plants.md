# Cutover step 4: seed plants + plant role assignments

This step wraps the EXISTING script `stacks/seed-sappi-workflow.ts`. It is not
duplicated or rewritten here; this file only documents how and when to run it
against prod, based on reading the script (not modifying it).

## What the script actually does (read 2026-07-06)

`stacks/seed-sappi-workflow.ts`:

1. Loads env via `dotenv.config()` (the plain `.env` in `stacks/`, NOT
   `.env.local`), reading `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and
   `SUPABASE_SERVICE_ROLE_KEY`. To target prod it must be invoked with
   `--env-file=.env.production` so those two prod values are what Node sees
   (tsx's `--env-file` values win over whatever plain `dotenv.config()` loads
   from `.env`, since dotenv only sets vars that are not already in
   `process.env`).
2. Finds the Sappi company by `ilike('name', '%sappi%')` against
   `public.companies`. Exits non-zero if zero or more than one match ("update
   this script with a specific company_id" -- it does NOT accept a
   company_id argument). This is safe: prod's Sappi company id is known and
   verified read-only as `9567b9ac-1c12-457f-8e49-321519c267b3`; the script
   will only proceed if exactly one row matches that ilike pattern.
3. Upserts one `plants` row for that company: `code = 'alfeld'`,
   `name = 'Sappi Alfeld Mill'`. Looks up by `(company_id, code)` first and
   reuses the existing id if found -- idempotent, safe to re-run.
4. For each of 8 named roles (`procurement`, `incident_officer`,
   `water_protection`, `pqm`, `security_specialist`, `head_procurement`,
   `operator_brk`, `fire_protection`), searches `public.users` scoped to the
   Sappi company by a fuzzy name/email match against hardcoded name hints
   (e.g. "B. Neumann", "Richard Huster"). If no user matches, it logs
   `[skip]` and moves on -- it does NOT fail the run. If a user matches, it
   `upsert`s into `plant_role_assignments` with
   `onConflict: 'plant_id,user_id,role', ignoreDuplicates: true` -- idempotent,
   re-running never creates duplicate assignments.
5. Note: only 8 of the 10 workflow roles are seeded here (`requestor` and
   `operator` are not in `ALFELD_ROLE_ASSIGNMENTS`). Those two roles have no
   named person in the Formblatt this script encodes; if the workflow needs
   them assigned, that is a manual follow-up via the `plant_role_assignments`
   table (no admin UI exists yet -- tracked as a post-cutover ticket).
6. KNOWN DEFECT (found 2026-07-07 via the read-only column probes for
   05-core-schema-reconciliation.sql): the user lookup in step 4 selects
   `id, email, name` from `users` and filters on `name.ilike...`, but the
   `users` table has NO `name` column in prod OR dev (probed; the real
   column is `full_name`). Every per-role user query therefore errors, the
   script logs `[skip] ... no matching user` for all 8 roles, and the run
   ends with `Assigned: 0`. The plant upsert (steps 2-3) still works. Until
   the script is fixed to select/filter `full_name` (a code change, out of
   scope for this task per the brief: do not modify the seed script), running
   it seeds the Alfeld plant only; role assignments must be inserted manually
   or after that fix lands.

## Guard convention: this script does NOT check CUTOVER_CONFIRM

Unlike every script under `scripts/cutover/`, `seed-sappi-workflow.ts` was
written before the cutover guard convention existed and has NO
`CUTOVER_CONFIRM` check. It was explicitly NOT modified for this task (per
the task brief: read-only review, no edits to the seed script). The operator
must supply `CUTOVER_CONFIRM=yes` on the command line below as a matter of
discipline -- the script itself will run without it. Do not skip setting the
variable just because the script does not enforce it; it is the same
"I meant to do this" signal used everywhere else in this runbook.

If tightening this properly is wanted later, add the standard guard block to
the top of `seed-sappi-workflow.ts` in a follow-up commit; out of scope here.

## Command (run from `stacks/`, not `stacks/web/`)

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks
CUTOVER_CONFIRM=yes npx tsx --env-file=.env.production seed-sappi-workflow.ts
```

Expected output: `Sappi company: 9567b9ac-1c12-457f-8e49-321519c267b3  Sappi`
(or the exact company name on file), then either `Plant already exists: ...`
or `Plant created: ...`, then one `[ok]` / `[skip]` line per role, then a
`Done. Assigned: N   Skipped: M` summary. Because of the known defect in
item 6 above (the lookup reads a nonexistent `users.name` column), expect
`Assigned: 0  Skipped: 13` on the current script: the plant seeds, the role
assignments all skip. That is the honest current behavior, not a transient
condition fixed by creating user accounts.

## Other tenants

`seed-sappi-workflow.ts` is Sappi-specific (hardcoded name hints and plant
code). Seeding plants/roles for other real tenants (UPM, etc.) is not covered
by this script and is out of scope for this cutover; track as a post-cutover
ticket (see README.md).

## What NOT to do

Never run `scripts/seed-workflow-dev.ts` against prod. That script upserts a
`Dev Plant 1` and grants one dev account every workflow role -- it exists
purely so a single dev login can walk the entire pipeline in the dev
environment (see SP3 cutover checklist item 3).

# Production cutover runbook

Rebuild `rebuild/v2` -> production (`beta.stacksdata.com`, Supabase
`yrguoooxamecsjtkfqcw`). This is a reviewed, ordered runbook. Nothing in this
directory executes automatically. **No script here writes to production
until an operator explicitly runs it with `CUTOVER_CONFIRM=yes`.**

Every `.ts` script in `scripts/cutover/` starts with:

```typescript
if (process.env.CUTOVER_CONFIRM !== 'yes') {
  console.error('Refusing to run: set CUTOVER_CONFIRM=yes explicitly. This script writes to PRODUCTION.')
  process.exit(1)
}
```

The one exception is `00-preflight.ts`: it is read-only (selects, head
counts, a bucket list) and carries a banner instead of a guard, so it can be
run at any time without ceremony.

## Files in this directory

| File | Purpose |
|---|---|
| `00-preflight.ts` | Read-only. Verifies prod's pre-cutover state. Writes `PREFLIGHT.md`. |
| `01-schema.sql` | The DB migration: pipeline tables (company-scoped RLS), workflow tables, notifications columns. |
| `05-core-schema-reconciliation.sql` | Additive column reconciliation for the seven core tables (19 columns the code uses but prod lacks). Step 5b, run immediately before the deploy; hard-gates Step 6. |
| `02-buckets-and-storage-policies.ts` | Guarded. Creates the two storage buckets; prints storage.objects policy SQL for manual application. |
| `03-seed-plants.md` | Instructions for running the existing `stacks/seed-sappi-workflow.ts` against prod. |
| `04-post-verify.ts` | Guarded. Same checks as 00, with post-cutover expectations. Prints a manual app smoke checklist. |
| `PREFLIGHT.md` | Generated evidence from the most recent `00-preflight.ts` run. Committed. |

---

## Rationale

The rebuild branch (`rebuild/v2`) has been the primary development target
for four sub-projects: extraction/mapping calibration on real supplier
documents, the Command Center on real data, and cutover closers (role-based
landing, dead-route deletion, reverse-ingestion fixes). Production
(`805973d`) is 47+ commits behind. Cutover promotes `rebuild/v2` to
production so the new surfaces (`/command`, `/station`), the pipeline
tables, the product-introduction workflow, and real in-app notifications
become the live experience.

### A security fix on rebuild/v2 is NOT yet on production

Commit `56ebe06` (`fix(security): isPublicPath matched every route,
disabling auth redirects app-wide`) fixed a middleware bug where
`pathname.startsWith(path)` matched every route once `path` was `'/'`
(everything starts with `/`), which meant the auth-redirect check never
fired for ANY route -- **current production serves every authenticated page
to unauthenticated visitors.** This fix exists only on `rebuild/v2`; it is
NOT on `main` (tip `1627204`) or `production` (tip `805973d`).

Full cutover (below) closes this as a side effect, since it promotes all of
`rebuild/v2` including this fix. But full cutover is a multi-step, reviewed
process with a quiet-period window. If the exposure needs to close sooner
than a full cutover can be scheduled, use Option A.

### Option A: expedited security hotfix (standalone emergency path)

This is a DIFFERENT, SMALLER action than the rest of this runbook. It does
not touch the database, storage, or any other app code -- it ships exactly
one middleware fix to close the unauthenticated-access exposure immediately,
without waiting for the full cutover window.

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks
git checkout production
git cherry-pick 56ebe06
npx tsc --noEmit --project web/tsconfig.json  # sanity check, changes are middleware-only
git push origin production
```

Notes:
- `56ebe06` touches only `web/src/middleware.ts` (3 lines). It has no
  dependency on any other rebuild/v2 change (pipeline tables, workflow
  tables, notifications columns are all unrelated), so cherry-picking it
  alone onto `production` is safe and self-contained.
- This does NOT delete `/demo/compliance` (that fix -- removing `/demo` from
  `publicPaths` and deleting the route entirely -- is bundled with
  `rebuild/v2`'s dead-route-deletion commit and is not a 3-line cherry-pick;
  closing that specific leak requires either full cutover or a second,
  separate targeted cherry-pick of the route deletion).
- After an Option A hotfix, `production`'s tip changes from `805973d` to a
  new commit. If the full cutover happens later the same day or later, redo
  Step 6 below from whatever `production`'s tip is at that time (the `git
  merge --ff-only` will simply carry `56ebe06` forward again since it is an
  ancestor of `rebuild/v2`).
- Rollback for Option A alone: `git revert <hotfix-commit>` and push, or
  (if nothing else has landed on `production` since, mirroring Step 8):

  ```bash
  git checkout production
  git reset --hard 805973d
  git push --force-with-lease origin production
  ```

---

## Pre-cutover state (verified read-only, 2026-07-06)

See `PREFLIGHT.md` for the full generated evidence. Headline facts this
runbook is built on:

- `notifications`: 0 rows in prod.
- Workflow tables (`plants`, `plant_role_assignments`,
  `product_introduction_workflows`, `workflow_steps`, `workflow_conditions`):
  ABSENT in prod.
- `canonical_answer_types`, `canonical_reference_substances`: PRESENT in
  prod with rows (these back `/parameters`; do not re-create or alter them).
- Pipeline tables (`extraction_documents`, `extraction_items`, etc.):
  PRESENT in prod, with data.
- Sappi company id in prod: `9567b9ac-1c12-457f-8e49-321519c267b3`.
- Branches are strictly linear: `production` (`805973d`) is behind `main`
  (`1627204`), which is behind `rebuild/v2` (contains `56ebe06` and
  everything after it).

### Correction to an assumed fact: storage buckets already exist

The task brief this runbook was written from assumed
`extraction-documents` / `generated-documents` were ABSENT in prod
(dev-only). Running `00-preflight.ts` for real shows both buckets already
exist in prod, created **2026-02-24** (private, 50MB limit each -- exactly
matching what `02-buckets-and-storage-policies.ts` would have created). This
predates the dev/prod split established for this rebuild; the original
pipeline feature (Jan/Feb 2026) was evidently built directly against what is
now called "prod." `00-preflight.ts` now expects the buckets PRESENT (so a
FAIL keeps signal) and `PREFLIGHT.md` reflects that. No action needed:
Step 3's bucket creation call is a no-op for bucket creation (it already
skips existing buckets) and still needs to run for the storage.objects
policy SQL it prints.

### CRITICAL: core-table schema drift goes well beyond the pipeline tables

`00-preflight.ts`'s schema-drift check (dev vs prod column parity on
`requests`, `sheets`, `answers`, `users`, `companies`, `choices`,
`questions`) came back with drift on **all 7** core tables, not the "these
predate the rebuild, should already match" outcome the source plans assumed.
This was independently confirmed with direct raw `select` calls against prod
(not just the OpenAPI-spec diff), for example:

```
prod answers columns (verified via `select *`):
  id, sheet_id, question_id, text_value, number_value, boolean_value,
  date_value, choice_id, list_table_row_id, list_table_column_id,
  company_id, created_by, created_at, modified_at, additional_notes
```

Prod's `answers` table has NO `parent_question_id`, `clarification`,
`text_area_value`, `file_url`, `support_file_url`, or `support_text`
columns -- all of which exist in dev and are actively read/written by
current code:
- `src/app/api/answers/route.ts` and `src/app/api/answers/batch/route.ts`
  write `answerData.clarification` whenever a clarification value is
  supplied.
- `src/components/sheets/question-item.tsx`, `src/hooks/use-answers.ts`,
  `src/lib/extraction/parameter-mapper.ts` all read/write `clarification`.

Similarly, `questions` in prod has `description` where dev has
`clarification` (a different, question-level column, distinct from the
answers one above) -- and dev-only also includes `question_type`,
`section_name_sort`, `subsection_name_sort`, `optional_question`,
`list_table_id`. The Station mapping route
(`src/app/api/station/request/[id]/mapping/route.ts` line 99) selects
`question_type, section_name_sort, subsection_name_sort, ... optional_question,
clarification` directly -- if this route runs against prod's actual
`questions` schema as it stands today, that select fails outright.

`companies` shows the same pattern: dev has `location_text`, prod has
`location` instead. `src/app/api/command/network/route.ts` (the Command
Center globe data source), `src/app/customers/[id]/page.tsx`,
`src/app/suppliers/[id]/page.tsx`, and
`src/components/suppliers/suppliers-list.tsx` all select/read
`location_text`. Notably, `git show 805973d` (production's CURRENT deployed
tip, unrelated to this cutover) already contains `company.location_text` in
`customers/[id]/page.tsx`. Since that page fetches with `select('*')`, the
missing column does not error there; the field silently reads as undefined
and the location line simply never renders in live production today. Paths
that NAME the column in a select string (the network route, the mapping
route) would error outright. All of this was re-verified column by column
with direct read-only probes while authoring
`05-core-schema-reconciliation.sql`.

**Resolution: `05-core-schema-reconciliation.sql` (Step 5b).** The
code-driven investigation this finding called for has been done: every
column the `rebuild/v2` code selects/inserts/updates on the seven core
tables was inventoried from src/, probed against prod read-only, and the
19 that are missing-and-used are added (strictly additively, with one
backfill: `location_text` from prod's `location`) by
`05-core-schema-reconciliation.sql`. Columns that are drifted but unused by
any code path are deliberately NOT added; see that file's header for the
full MISSING/PRESENT/not-added evidence, plus two app-code bugs it surfaced
(columns referenced by code that exist in NEITHER environment:
`answers.parent_sheet_id` in compliance-stats, `users.name` in
seed-sappi-workflow). Full raw drift detail (all 7 tables, every column) is
in `PREFLIGHT.md`.

---

## Full cutover runbook

Ordered, explicit. Each step names the exact command. Steps 2-5 write to
prod; run them only after Scott has said go (see the go/no-go gate, a
separate task/turn -- this runbook is written and reviewed, not executed, as
part of this task).

**HARD GATE before Step 6: DO NOT run Step 6 until
`05-core-schema-reconciliation.sql` (Step 5b) has been applied to prod and
verified (its columns show PASS in the Step 5b `04-post-verify.ts` re-run).
And conversely, once 5b HAS run, proceed to Step 6 immediately (see the
residual-window note in Step 5b).**
This is a blocking precondition, not a recommendation. Deploying
`rebuild/v2` code to production while prod's `answers` / `questions` /
`companies` / `requests` / `users` tables are missing columns that code
directly selects (confirmed for `clarification`, `text_area_value`,
`file_url`, `question_type`, `section_name_sort`, `location_text`,
`product_name`, `first_name`, and more; see "CRITICAL: core-table schema
drift" above) breaks those code paths outright in production, independent
of anything Steps 1-5 do.

### Step 0: Freeze

Announce the quiet-period window to Scott and anyone else with prod access.
Verify no active supplier sessions matter enough to delay (business call,
not a scripted check -- Sappi and UPM are the active customers per current
account state; check whether either has an in-flight submission).

### Step 1: Vercel env verification (read-only)

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks/web
vercel env ls
```

Confirm the **Production** scope has:
- `NEXT_PUBLIC_SUPABASE_URL` pointing at prod ref `yrguoooxamecsjtkfqcw`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` starting with `sk-ant-` (the code now hard-throws at
  startup if this is missing or malformed -- see `src/lib/anthropic.ts`)
- `SENDGRID_API_KEY`
- `NEXT_PUBLIC_SITE_URL=https://beta.stacksdata.com`

Values are checked in the Vercel dashboard, not printed to a terminal or
committed anywhere.

### Step 2: Database schema

Apply `01-schema.sql` to prod via the Supabase CLI linked to prod, or the
dashboard SQL editor. Check link state first:

```bash
supabase projects list
supabase link --project-ref yrguoooxamecsjtkfqcw   # only if not already linked to prod
```

Then either `supabase db push` with `01-schema.sql` staged as a migration,
or paste the file's contents into the SQL editor and run it. Record the
start time (for the rollback narrative and for correlating with any error
logs).

### Step 3: Storage buckets and policies

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks/web
CUTOVER_CONFIRM=yes npx tsx --env-file=../.env.production scripts/cutover/02-buckets-and-storage-policies.ts
```

Then apply the storage.objects policy SQL the script prints, via the SQL
editor (or a linked CLI) -- storage.objects policies cannot be created
through the JS client.

### Step 4: Plants seed

Follow `03-seed-plants.md` exactly (it wraps the existing
`stacks/seed-sappi-workflow.ts`, run from `stacks/`, not `stacks/web/`).

### Step 5: Verify

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks/web
CUTOVER_CONFIRM=yes npx tsx --env-file=../.env.production scripts/cutover/04-post-verify.ts
```

At this point in the sequence, expect exactly ONE failing section: the
"Core-table reconciliation columns" block (those 19 columns arrive in
Step 5b, deliberately held until just before the deploy). Every other check
must show PASS. If anything ELSE FAILs, stop and diagnose -- do not proceed
with an unverified database.

### Step 5b: Core-table schema reconciliation (immediately before Step 6)

Apply `05-core-schema-reconciliation.sql` to prod (CLI or SQL editor), then
immediately re-run the Step 5 verify command and confirm ALL checks now
PASS, then proceed straight to Step 6 without pausing.

What it does: adds the 19 columns the rebuild/v2 code reads/writes on the
core tables but prod lacks (strictly additive: ADD COLUMN IF NOT EXISTS, two
guarded FK constraints for the questions->sections/subsections embeds, and
one backfill of `companies.location_text` from prod's existing `location`
column). Idempotent, rerun-safe. Evidence and method are in the file's
header. **Step 6 is hard-gated on this step** (see the gate note above the
runbook steps): without it, the station mapping route, answers writes with
clarifications, the Excel export, the command/station request tables
(product_name), the network globe, and the contacts API all hit
missing-column errors on prod.

**Why this step runs LAST before the deploy, and the residual window:** the
new `questions_parent_subsection_id_fkey` gives `questions` a second FK to
`subsections`, which makes the OLD code's unhinted `subsections( ... )`
embed (classic sheet detail/edit pages as deployed on `production` today)
ambiguous (PGRST201) the moment the constraint exists. The rebuild/v2 code
being deployed in Step 6 hints that embed
(`subsections!questions_subsection_id_fkey`), which works with either one
or two FKs present (probed on both prod and dev). Running 5b immediately
before Step 6 shrinks the exposure to the minutes between the constraint
landing and the Vercel deploy going live; during that window, the classic
sheet detail and sheet edit pages on the OLD deploy lose their section
grouping (the embed errors and the pages fall back to ungrouped questions).
Accepted and disclosed; do not schedule a pause between 5b and 6.

### Step 6: Code

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks
git checkout main
git merge --ff-only rebuild/v2
git push origin main
git checkout production
git merge --ff-only main
git push origin production   # Vercel auto-deploys the production branch
```

Fallback if the git-integration deploy does not fire or a manual deploy is
needed:

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks/web
vercel --prod
```

### Step 7: Smoke test on https://beta.stacksdata.com

- Log in as a real account.
- `/` lands on the correct surface (customer -> `/command`, supplier ->
  `/station`; unauthenticated -> `/login`, no more dashboard bounce).
- `/command` renders: request table with real totals, globe confined to its
  panel, notification bell.
- `/station` renders: pending request list, user menu with logout.
- Upload one small PDF end to end (extraction completes, items show up in
  Review).
- Bell delivers a real notification on a status change.
- Excel export from a sheet still works.
- Classic view (`/dashboard`) reachable from both new surfaces.
- Also verify per SP2 cutover checklist item 4: prod RLS permits
  `answers/batch` reads of `questions.response_type` and `choices` under a
  real user session, and the review-client's read of `requests.requestor_id`
  from the browser client. These predate the pipeline rebuild and are not
  touched by `01-schema.sql`; this is a verification step, not a migration.

### Step 8: Rollback

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks
git checkout production
git reset --hard 805973d
git push --force-with-lease origin production
```

`805973d` is `production`'s tip as verified 2026-07-06, immediately before
this cutover. **Re-verify this hash at execution time** -- if an Option A
hotfix (or anything else) has landed on `production` between now and the
actual cutover run, update this rollback target to whatever `production`'s
tip is right before Step 6 runs, and record it here.

Database changes from Steps 2, 3, 4, and 5b are additive (new tables, new
nullable columns, new buckets) and nothing in `01-schema.sql` or
`05-core-schema-reconciliation.sql` drops or renames anything that predates
it. ONE exception to "safe to leave in place after a code rollback": the
`questions_parent_subsection_id_fkey` constraint from Step 5b makes the OLD
code's unhinted `subsections( ... )` embed ambiguous, so rolling the code
back to `805973d` re-exposes the classic sheet detail/edit pages to that
PGRST201 failure (they render without section grouping) until either the
embed-hint code fix ships to `production` or the constraint is dropped.
DB-side rollback for that specific regression, if the code rollback needs
to hold for more than a few minutes:

```sql
ALTER TABLE questions DROP CONSTRAINT questions_parent_subsection_id_fkey;
```

(Everything else 05 added is inert under the old code and stays.)

### Step 9: Post-cutover tickets

Tracked, not done in this runbook:
1. Regenerate `src/lib/database.types.ts` (deferred throughout the rebuild
   to avoid surfacing hundreds of pre-existing type errors app-wide).
2. Audit `is_super_admin` flags on real prod users (the dev convenience flag
   must have no prod analog).
3. Filled-questionnaire backfill feature (blank cells in a filled
   questionnaire never get prior-answer suggestions today; deferred,
   recorded in the SP4 plan).
4. Classic dark retheme decision (classic management screens stay light as
   "Classic View" per the SP3 scope decision; a full retheme is a
   page-by-page rewrite Scott can schedule explicitly).
5. Seed plants + `plant_role_assignments` for tenants other than Sappi
   (UPM, etc.) -- `seed-sappi-workflow.ts` is Sappi-specific.
6. Add a plant/role admin UI (today: seed script only, no UI).
7. Fix the two code paths that reference columns existing in NEITHER
   environment (found by the 05 reconciliation probes):
   `src/lib/compliance-stats.ts` selects `answers.parent_sheet_id`, and
   `stacks/seed-sappi-workflow.ts` selects/filters `users.name` (should be
   `full_name`; until fixed the seed assigns zero roles, see
   `03-seed-plants.md` item 6).

---

## Source checklist cross-reference

This runbook consumes the cutover checklists appended to
`docs/plans/2026-07-06-station-real-data-plan.md` (SP2) and
`docs/plans/2026-07-06-command-real-data-plan.md` (SP3). Mapping:

**SP2 checklist:**
1. Storage buckets on prod -> Step 3 / `02-buckets-and-storage-policies.ts`.
2. Pipeline migration + storage policies, company-scoped -> `01-schema.sql`
   Section 1 + Step 3.
3. Do not run `20260706000001` on prod; verify RLS posture instead ->
   `01-schema.sql` Section 5 explicitly excludes it; RLS posture check is a
   manual dashboard step (no anon key available in the read-only preflight
   environment to script an anon-role probe).
4. Verify prod RLS permits specific reads (`answers/batch`,
   `requests.requestor_id`) -> Step 7 smoke test.
5. Vercel prod env vars -> Step 1.
6. Harden `/api/requests/notify-submitted` -> already done in code (session
   auth required, company match enforced; verified by reading the route).
7. Verify supabase CLI link state before any prod migration push -> Step 2.
8. Keep seed/calibration scripts pinned to `.env.local` -> unchanged; none
   of those scripts are touched by this task.

**SP3 checklist:**
1. Apply notifications columns migration to prod -> `01-schema.sql`
   Section 3.
2. Backfill legacy notifications to `read = true` before the bell goes live
   -> `01-schema.sql` Section 3 defensive UPDATE; verified by
   `04-post-verify.ts`.
3. Seed plants + role assignments for real tenants; never run
   `seed-workflow-dev.ts` against prod -> Step 4 / `03-seed-plants.md`.
4. Audit `is_super_admin` flags in prod -> Step 9 post-cutover ticket.
5. Regenerate `database.types.ts` -> Step 9 post-cutover ticket.

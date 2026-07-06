-- Bring dev DB up to parity for the supplier sheet request flow.
-- Idempotent. Safe to run multiple times. DEV project (cvsevqcmfiwkjuwppeir) only.

-- 1. THE BLOCKER: request creation inserts sheets.import_source
alter table public.sheets add column if not exists import_source text;

-- 1b. Review flag/respond/approve flow: dev answer_rejections is missing columns
--     the review + supplier-edit pages read (response, comments, resolved_at).
alter table public.answer_rejections add column if not exists response text;
alter table public.answer_rejections add column if not exists comments jsonb default '[]'::jsonb;
alter table public.answer_rejections add column if not exists resolved_at timestamptz;

-- 2. company_questions (custom-questions feature; currently 500s the dialog's load)
create table if not exists public.company_questions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  question_text text not null,
  response_type text not null default 'text',
  choices jsonb,
  hint text,
  required boolean not null default false,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.company_questions enable row level security;
drop policy if exists "auth_all_company_questions" on public.company_questions;
create policy "auth_all_company_questions" on public.company_questions
  for all to authenticated using (true) with check (true);
grant all on public.company_questions to authenticated, anon, service_role;

-- 3. request_custom_questions (links custom questions to a request)
create table if not exists public.request_custom_questions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  company_question_id uuid not null references public.company_questions(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.request_custom_questions enable row level security;
drop policy if exists "auth_all_request_custom_questions" on public.request_custom_questions;
create policy "auth_all_request_custom_questions" on public.request_custom_questions
  for all to authenticated using (true) with check (true);
grant all on public.request_custom_questions to authenticated, anon, service_role;

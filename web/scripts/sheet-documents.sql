-- Sheet-level supplier documents (RDS / SDS) + attachment access scoping
--
-- UPM asked to "add and receive attached additional documents like suppliers
-- custom Regulatory Data Sheets or Safety Data Sheets". Those describe the
-- product, not one question, so they cannot hang off a question_id.
--
-- Two changes:
--   1. Allow question_id to be null. NULL question_id == a sheet-level
--      document. Adds document_type so RDS/SDS/Other can be labelled.
--   2. Close the access hole. The existing policies were "Allow all reads",
--      "Allow all inserts", "Allow all deletes" on the table and an unscoped
--      bucket_id check on storage, so ANY authenticated user of ANY company
--      could read every supplier's attachments. Since this change puts
--      confidential supplier safety documents in the same bucket, access is
--      now scoped to the companies party to the sheet.
--
-- Idempotent: safe to re-run.

begin;

-- 0. Baseline. Production already has this table and bucket; the dev project
--    does not (known schema drift), so create them when absent to keep one
--    file runnable against both.

create table if not exists public.question_attachments (
  id          uuid primary key default gen_random_uuid(),
  sheet_id    uuid not null references public.sheets(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  user_id     uuid not null,
  file_name   text not null,
  file_path   text not null,
  file_size   integer not null,
  mime_type   text not null,
  created_at  timestamptz default now()
);

alter table public.question_attachments enable row level security;

insert into storage.buckets (id, name, public)
values ('question-attachments', 'question-attachments', false)
on conflict (id) do nothing;

-- 1. Sheet-level documents ---------------------------------------------------

alter table public.question_attachments
  alter column question_id drop not null;

alter table public.question_attachments
  add column if not exists document_type text;

comment on column public.question_attachments.question_id is
  'Null means the file is attached to the sheet as a whole (e.g. a supplier RDS or SDS) rather than to a single question.';
comment on column public.question_attachments.document_type is
  'Optional label for sheet-level documents: RDS, SDS, or Other.';

create index if not exists question_attachments_sheet_scope_idx
  on public.question_attachments (sheet_id, question_id);

-- 2. Access scoping ----------------------------------------------------------

-- True when the current user's company is party to the sheet, either as the
-- supplier answering it or the customer that requested it.
create or replace function public.can_access_sheet(target_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    is_super_admin() = true
    or exists (
      select 1
      from sheets s
      where s.id = target_sheet_id
        and (s.company_id = user_company_id()
             or s.requesting_company_id = user_company_id())
    ),
    false
  );
$$;

drop policy if exists "Allow all reads"   on public.question_attachments;
drop policy if exists "Allow all inserts" on public.question_attachments;
drop policy if exists "Allow all deletes" on public.question_attachments;

create policy question_attachments_select on public.question_attachments
  for select using (public.can_access_sheet(sheet_id));

create policy question_attachments_insert on public.question_attachments
  for insert with check (public.can_access_sheet(sheet_id) and user_id = auth.uid());

-- Uploaders may remove their own files; a sheet's counterparty may not.
create policy question_attachments_delete on public.question_attachments
  for delete using (user_id = auth.uid() or is_super_admin() = true);

-- Storage objects. Paths are  <user_id>/<sheet_id>/<question_id|_sheet>/<file>
-- so segment 2 is the sheet id in both the question-scoped and sheet-scoped
-- layouts. Guard the cast: a malformed path must not error the policy.
drop policy if exists "Authenticated users can upload attachments" on storage.objects;
drop policy if exists "Users can view attachments they have access to" on storage.objects;
drop policy if exists "Users can delete their own attachments" on storage.objects;

create policy "Attachment reads are scoped to the sheet's companies"
  on storage.objects for select
  using (
    bucket_id = 'question-attachments'
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_sheet(((storage.foldername(name))[2])::uuid)
  );

create policy "Attachment uploads are scoped to the sheet's companies"
  on storage.objects for insert
  with check (
    bucket_id = 'question-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_sheet(((storage.foldername(name))[2])::uuid)
  );

create policy "Users can delete their own attachments"
  on storage.objects for delete
  using (
    bucket_id = 'question-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

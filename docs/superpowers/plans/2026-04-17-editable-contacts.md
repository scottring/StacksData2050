# Editable Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Primary Contact card on supplier and customer detail pages into a unified, editable "Contacts" surface with add/edit/delete/primary-toggle, backed by the existing `users` table.

**Architecture:** New schema columns (`job_title`, `has_logged_in`). Existing `is_company_main_contact` flag becomes primary-contact source of truth. Mutations go through service-role API routes at `/api/companies/[id]/contacts` with cross-tenant permission checks. UI is one `ContactsCard` client component shared by supplier detail, customer detail, and (new) customer detail page. Edit/add uses a shadcn `Sheet` drawer.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (service role for writes), shadcn/ui (`Sheet`, `AlertDialog`, `Input`, `Checkbox`, `Switch`, `Button`), Tailwind v4, sonner toasts, lucide-react icons. No new npm deps.

**Testing:** The project has no unit-test framework. Verification is `npm run build` (type-check) plus manual browser testing per task. API routes verified with `curl`.

**Working dir:** `stacks/web` unless a step says otherwise.

**Commit style:** Small, per-task. Conventional commits (`feat:`, `chore:`, etc.).

---

## File Map

**New:**
- `web/supabase/migrations/20260417000001_contacts_editable.sql` — schema migration
- `web/src/lib/auth/has-relationship.ts` — cross-company permission helper
- `web/src/app/api/companies/[id]/contacts/[contactId]/route.ts` — PATCH, DELETE
- `web/src/components/contacts/use-contacts.ts` — fetch + mutate hook
- `web/src/components/contacts/contact-form-sheet.tsx` — drawer form
- `web/src/components/contacts/contact-row.tsx` — single row
- `web/src/components/contacts/contacts-card.tsx` — unified card
- `web/src/components/ui/sheet.tsx` — shadcn Sheet (generated)
- `web/src/app/customers/[id]/page.tsx` — new customer detail page

**Modified:**
- `web/src/middleware.ts` — bump `has_logged_in` on first authed request
- `web/src/app/api/companies/[id]/contacts/route.ts` — extend GET select, add POST
- `web/src/app/suppliers/[id]/page.tsx` — replace Primary/Other cards with `<ContactsCard />`
- `web/src/app/suppliers/page.tsx` — switch primary selector to `is_company_main_contact`
- `web/src/app/customers/page.tsx` — switch primary selector to `is_company_main_contact`
- `web/src/lib/database.types.ts` — regenerated after migration

---

## Task 1: Schema migration

**Files:**
- Create: `web/supabase/migrations/20260417000001_contacts_editable.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Editable contacts: add CRM fields, introduce has_logged_in lock flag
alter table public.users
  add column if not exists job_title text,
  add column if not exists has_logged_in boolean not null default false;

-- Backfill: anyone who has a non-placeholder email AND password_changed is true
-- was plausibly active in legacy Bubble; treat them as logged in to protect
-- their records.
update public.users
set has_logged_in = true
where password_changed = true
  and email is not null
  and email not ilike '%placeholder%';

create index if not exists users_company_id_is_main_contact_idx
  on public.users (company_id)
  where is_company_main_contact = true;
```

- [ ] **Step 2: Apply migration to dev Supabase**

Via Supabase dashboard SQL editor for project `cvsevqcmfiwkjuwppeir`, paste and run the migration body. Verify with:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'users'
  and column_name in ('job_title', 'has_logged_in');
```

Expected output: two rows, `job_title` nullable text, `has_logged_in` not null boolean default false.

- [ ] **Step 3: Regenerate types**

Preferred — Supabase CLI (requires `supabase login` to have been run once):

```bash
cd stacks/web
npx supabase gen types typescript --project-id cvsevqcmfiwkjuwppeir > src/lib/database.types.ts
```

Fallback — manual edit if the CLI is not authenticated. Open `web/src/lib/database.types.ts`, locate the `users.Row` block (around line 2171), and add inside `Row`, `Insert`, and `Update`:

```typescript
          job_title: string | null      // Row: nullable
          has_logged_in: boolean | null // Row (treated as nullable by type gen even with default)
```

For `Insert` and `Update`, mirror these as optional (`job_title?: string | null`, `has_logged_in?: boolean | null`).

Verify:
```bash
grep -n "job_title\|has_logged_in" web/src/lib/database.types.ts
```
Expected: at least 6 matches (Row/Insert/Update × 2 columns).

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/20260417000001_contacts_editable.sql web/src/lib/database.types.ts
git commit -m "feat: add job_title and has_logged_in columns to users"
```

---

## Task 2: Middleware bumps has_logged_in

**Files:**
- Modify: `web/src/middleware.ts:92-96`

- [ ] **Step 1: Extend the existing user fetch to include has_logged_in**

Replace the block at lines 92-96 of `web/src/middleware.ts`:

```typescript
  const { data: userData } = await supabase
    .from('users')
    .select('role, has_logged_in')
    .eq('id', user.id)
    .single()
```

- [ ] **Step 2: Flip the flag on first authed hit**

Immediately after the `if (!userData) { ... }` block (which ends around line 104 today) and before the super-admin check, insert:

```typescript
  if (userData.has_logged_in === false) {
    // Fire-and-forget; don't block the request on this write.
    void supabase.from('users').update({ has_logged_in: true }).eq('id', user.id)
  }
```

- [ ] **Step 3: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds. If types complain about `has_logged_in` not existing, Task 1 Step 3 did not regenerate types; re-run it.

- [ ] **Step 4: Manual verify**

Start dev server (`npm run dev`), log in as any demo user, then:

```sql
select id, email, has_logged_in from users where email = '<the email you logged in with>';
```

Expected: `has_logged_in = true`.

- [ ] **Step 5: Commit**

```bash
git add web/src/middleware.ts
git commit -m "feat: flip has_logged_in on first authenticated request"
```

---

## Task 3: Cross-company permission helper

**Files:**
- Create: `web/src/lib/auth/has-relationship.ts`

- [ ] **Step 1: Write helper**

```typescript
import { createClient } from '@supabase/supabase-js'

type ServiceClient = ReturnType<typeof createClient>

// Returns true if myCompanyId has a real relationship with targetCompanyId:
// at least one sheet where one is supplier and the other is requester, or a
// request between the two. Used to gate cross-company writes.
export async function companiesHaveRelationship(
  serviceClient: ServiceClient,
  myCompanyId: string,
  targetCompanyId: string
): Promise<boolean> {
  if (myCompanyId === targetCompanyId) return true

  const { count: sheetCount } = await serviceClient
    .from('sheets')
    .select('id', { count: 'exact', head: true })
    .or(
      `and(company_id.eq.${myCompanyId},requesting_company_id.eq.${targetCompanyId}),` +
      `and(company_id.eq.${targetCompanyId},requesting_company_id.eq.${myCompanyId})`
    )

  if ((sheetCount ?? 0) > 0) return true

  const { count: requestCount } = await serviceClient
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .or(
      `and(requestor_id.eq.${myCompanyId},requesting_from_id.eq.${targetCompanyId}),` +
      `and(requestor_id.eq.${targetCompanyId},requesting_from_id.eq.${myCompanyId})`
    )

  return (requestCount ?? 0) > 0
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/auth/has-relationship.ts
git commit -m "feat: add cross-company relationship check"
```

---

## Task 4: Extend GET, add POST to contacts route

**Files:**
- Modify: `web/src/app/api/companies/[id]/contacts/route.ts` (full rewrite)

- [ ] **Step 1: Rewrite the route**

Replace the entire file contents:

```typescript
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { companiesHaveRelationship } from '@/lib/auth/has-relationship'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const CONTACT_FIELDS =
  'id, email, first_name, last_name, full_name, phone_text, job_title, is_company_main_contact, has_logged_in'

function isPlaceholder(row: { email?: string | null; full_name?: string | null }) {
  return (
    !row.email ||
    row.email.includes('placeholder') ||
    !row.full_name ||
    row.full_name === 'Unknown'
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const service = getServiceClient()

    const { data: contacts } = await service
      .from('users')
      .select(CONTACT_FIELDS)
      .eq('company_id', companyId)
      .order('full_name')

    const validContacts = (contacts || []).filter((c) => !isPlaceholder(c))

    return NextResponse.json(validContacts)
  } catch (error) {
    console.error('GET contacts error:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

type PostBody = {
  first_name: string
  last_name: string
  email: string
  phone_text?: string
  job_title?: string
  is_primary?: boolean
  send_invite?: boolean
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetCompanyId } = await params
    const body = (await request.json()) as PostBody

    if (!body.first_name?.trim() || !body.last_name?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { error: 'first_name, last_name, and email are required' },
        { status: 400 }
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Auth + relationship check
    const userSupabase = await createUserClient()
    const {
      data: { user },
    } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await userSupabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()
    if (!me?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = getServiceClient()
    const allowed = await companiesHaveRelationship(service, me.company_id, targetCompanyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Duplicate-email check within target company
    const { data: dup } = await service
      .from('users')
      .select('id')
      .eq('company_id', targetCompanyId)
      .ilike('email', body.email.trim())
      .maybeSingle()
    if (dup) {
      return NextResponse.json(
        { error: 'A contact with that email already exists at this company' },
        { status: 409 }
      )
    }

    // Demote existing primary if needed
    if (body.is_primary) {
      await service
        .from('users')
        .update({ is_company_main_contact: false })
        .eq('company_id', targetCompanyId)
        .eq('is_company_main_contact', true)
    }

    const full_name = `${body.first_name.trim()} ${body.last_name.trim()}`.trim()
    const { data: inserted, error: insertError } = await service
      .from('users')
      .insert({
        company_id: targetCompanyId,
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        full_name,
        email: body.email.trim(),
        phone_text: body.phone_text?.trim() || null,
        job_title: body.job_title?.trim() || null,
        is_company_main_contact: !!body.is_primary,
        has_logged_in: false,
      })
      .select(CONTACT_FIELDS)
      .single()

    if (insertError || !inserted) {
      console.error('Insert contact error:', insertError)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }

    let invite_sent = false
    if (body.send_invite) {
      const { error: inviteError } = await service.auth.admin.inviteUserByEmail(
        body.email.trim()
      )
      invite_sent = !inviteError
      if (inviteError) console.error('Invite error:', inviteError)
    }

    return NextResponse.json({ contact: inserted, invite_sent }, { status: 201 })
  } catch (error) {
    console.error('POST contact error:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Manual verify GET unchanged**

With dev server running and logged in as Kalle Luomi (UPM):

```bash
curl -s 'http://localhost:3000/api/companies/62217ae4-3e19-4bae-9a64-0b705ca4f5fe/contacts' | head
```

Expected: JSON array of contacts (same shape as before plus `phone_text`, `job_title`, `is_company_main_contact`, `has_logged_in` fields).

- [ ] **Step 4: Commit**

```bash
git add web/src/app/api/companies/[id]/contacts/route.ts
git commit -m "feat: add POST to contacts API, extend GET with new fields"
```

---

## Task 5: PATCH and DELETE contact route

**Files:**
- Create: `web/src/app/api/companies/[id]/contacts/[contactId]/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { companiesHaveRelationship } from '@/lib/auth/has-relationship'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const CONTACT_FIELDS =
  'id, email, first_name, last_name, full_name, phone_text, job_title, is_company_main_contact, has_logged_in, company_id'

type PatchBody = {
  first_name?: string
  last_name?: string
  email?: string
  phone_text?: string | null
  job_title?: string | null
  is_primary?: boolean
}

async function authorize(companyId: string) {
  const userSupabase = await createUserClient()
  const {
    data: { user },
  } = await userSupabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 }

  const { data: me } = await userSupabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!me?.company_id) return { ok: false as const, status: 401 }

  const service = getServiceClient()
  const allowed = await companiesHaveRelationship(service, me.company_id, companyId)
  if (!allowed) return { ok: false as const, status: 403 }

  return { ok: true as const, service, myCompanyId: me.company_id }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: targetCompanyId, contactId } = await params
    const auth = await authorize(targetCompanyId)
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

    const { data: existing } = await auth.service
      .from('users')
      .select(CONTACT_FIELDS)
      .eq('id', contactId)
      .single()
    if (!existing || existing.company_id !== targetCompanyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.has_logged_in === true) {
      return NextResponse.json(
        { error: 'This contact has an active account and must edit their own profile.' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as PatchBody

    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (body.email && body.email !== existing.email) {
      const { data: dup } = await auth.service
        .from('users')
        .select('id')
        .eq('company_id', targetCompanyId)
        .ilike('email', body.email.trim())
        .neq('id', contactId)
        .maybeSingle()
      if (dup) {
        return NextResponse.json(
          { error: 'A contact with that email already exists at this company' },
          { status: 409 }
        )
      }
    }

    if (body.is_primary === true) {
      await auth.service
        .from('users')
        .update({ is_company_main_contact: false })
        .eq('company_id', targetCompanyId)
        .eq('is_company_main_contact', true)
        .neq('id', contactId)
    }

    const patch: Record<string, unknown> = {}
    if (body.first_name !== undefined) patch.first_name = body.first_name.trim()
    if (body.last_name !== undefined) patch.last_name = body.last_name.trim()
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const first = (body.first_name ?? existing.first_name ?? '').trim()
      const last = (body.last_name ?? existing.last_name ?? '').trim()
      patch.full_name = `${first} ${last}`.trim()
    }
    if (body.email !== undefined) patch.email = body.email.trim()
    if (body.phone_text !== undefined)
      patch.phone_text = body.phone_text ? String(body.phone_text).trim() : null
    if (body.job_title !== undefined)
      patch.job_title = body.job_title ? String(body.job_title).trim() : null
    if (body.is_primary !== undefined) patch.is_company_main_contact = !!body.is_primary

    const { data: updated, error: updateError } = await auth.service
      .from('users')
      .update(patch)
      .eq('id', contactId)
      .select(CONTACT_FIELDS)
      .single()
    if (updateError || !updated) {
      console.error('PATCH contact error:', updateError)
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }

    return NextResponse.json({ contact: updated })
  } catch (error) {
    console.error('PATCH contact error:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: targetCompanyId, contactId } = await params
    const auth = await authorize(targetCompanyId)
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

    const { data: existing } = await auth.service
      .from('users')
      .select('id, company_id, has_logged_in')
      .eq('id', contactId)
      .single()
    if (!existing || existing.company_id !== targetCompanyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.has_logged_in === true) {
      return NextResponse.json(
        { error: 'This contact has an active account and cannot be deleted here.' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await auth.service
      .from('users')
      .delete()
      .eq('id', contactId)
    if (deleteError) {
      console.error('DELETE contact error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE contact error:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/companies/[id]/contacts/[contactId]/route.ts
git commit -m "feat: add PATCH and DELETE to contact API"
```

---

## Task 6: Add shadcn Sheet component

**Files:**
- Create: `web/src/components/ui/sheet.tsx` (generated)

- [ ] **Step 1: Generate via shadcn CLI**

```bash
cd stacks/web
npx shadcn@latest add sheet
```

When prompted about overwrites, accept defaults.

- [ ] **Step 2: Verify the file exists and exports Sheet primitives**

```bash
grep -n "export " web/src/components/ui/sheet.tsx | head
```

Expected: exports include `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`.

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/ui/sheet.tsx web/package.json web/package-lock.json
git commit -m "chore: add shadcn Sheet component"
```

---

## Task 7: useContacts hook

**Files:**
- Create: `web/src/components/contacts/use-contacts.ts`

- [ ] **Step 1: Write hook**

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Contact {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  phone_text: string | null
  job_title: string | null
  is_company_main_contact: boolean | null
  has_logged_in: boolean | null
}

export interface ContactInput {
  first_name: string
  last_name: string
  email: string
  phone_text?: string
  job_title?: string
  is_primary?: boolean
  send_invite?: boolean
}

export function useContacts(companyId: string) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/contacts`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Contact[]
      setContacts(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const create = useCallback(
    async (input: ContactInput) => {
      const res = await fetch(`/api/companies/${companyId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json.error || 'Failed', res.status)
      await refetch()
      return json as { contact: Contact; invite_sent: boolean }
    },
    [companyId, refetch]
  )

  const update = useCallback(
    async (contactId: string, patch: Partial<ContactInput>) => {
      const res = await fetch(`/api/companies/${companyId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json.error || 'Failed', res.status)
      await refetch()
      return json as { contact: Contact }
    },
    [companyId, refetch]
  )

  const remove = useCallback(
    async (contactId: string) => {
      const res = await fetch(`/api/companies/${companyId}/contacts/${contactId}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(json.error || 'Failed', res.status)
      await refetch()
    },
    [companyId, refetch]
  )

  const setPrimary = useCallback(
    (contactId: string) => update(contactId, { is_primary: true }),
    [update]
  )

  return { contacts, loading, error, refetch, create, update, remove, setPrimary }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/contacts/use-contacts.ts
git commit -m "feat: add useContacts hook"
```

---

## Task 8: ContactFormSheet drawer

**Files:**
- Create: `web/src/components/contacts/contact-form-sheet.tsx`

- [ ] **Step 1: Write component**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Lock } from 'lucide-react'
import { ApiError, type Contact, type ContactInput } from './use-contacts'

interface Props {
  mode: 'add' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact
  onSubmit: (input: ContactInput) => Promise<unknown>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactFormSheet({ mode, open, onOpenChange, contact, onSubmit }: Props) {
  const locked = contact?.has_logged_in === true && mode === 'edit'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [sendInvite, setSendInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setFirstName(contact?.first_name ?? '')
    setLastName(contact?.last_name ?? '')
    setEmail(contact?.email ?? '')
    setPhone(contact?.phone_text ?? '')
    setJobTitle(contact?.job_title ?? '')
    setIsPrimary(contact?.is_company_main_contact === true)
    setSendInvite(false)
    setErrors({})
  }, [open, contact])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = 'Required'
    if (!lastName.trim()) next.lastName = 'Required'
    if (!email.trim()) next.email = 'Required'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Invalid email'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (locked) return
    if (!validate()) return
    setSaving(true)
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone_text: phone.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        is_primary: isPrimary,
        send_invite: mode === 'add' ? sendInvite : undefined,
      })
      toast.success(mode === 'add' ? 'Contact added' : 'Contact updated')
      onOpenChange(false)
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) setErrors({ email: e.message })
        toast.error(e.message)
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === 'add' ? 'Add contact' : 'Edit contact'}</SheetTitle>
          <SheetDescription>
            {mode === 'add'
              ? 'Add a new contact at this company.'
              : 'Update this contact’s details.'}
          </SheetDescription>
        </SheetHeader>

        {locked && (
          <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <Lock className="h-4 w-4 mt-0.5" />
            <span>This contact has an active account — they manage their own profile.</span>
          </div>
        )}

        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={locked || saving}
              />
              {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={locked || saving}
              />
              {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={locked || saving}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={locked || saving}
            />
          </div>

          <div>
            <Label htmlFor="jobTitle">Job title</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={locked || saving}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(v) => setIsPrimary(v === true)}
              disabled={locked || saving}
            />
            <Label htmlFor="isPrimary" className="cursor-pointer">
              Set as primary contact
            </Label>
          </div>

          {mode === 'add' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendInvite"
                checked={sendInvite}
                onCheckedChange={(v) => setSendInvite(v === true)}
                disabled={saving}
              />
              <Label htmlFor="sendInvite" className="cursor-pointer">
                Send invitation email now
              </Label>
            </div>
          )}
        </div>

        {!locked && (
          <div className="flex justify-end gap-2 px-4 pb-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds. If `Checkbox` or `Label` are missing, run `npx shadcn@latest add checkbox label`.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/contacts/contact-form-sheet.tsx
git commit -m "feat: add ContactFormSheet drawer"
```

---

## Task 9: ContactRow

**Files:**
- Create: `web/src/components/contacts/contact-row.tsx`

- [ ] **Step 1: Write component**

```typescript
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Pencil, Trash2, Star, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError, type Contact } from './use-contacts'

interface Props {
  contact: Contact
  onEdit: (contact: Contact) => void
  onSetPrimary: (contactId: string) => Promise<unknown>
  onDelete: (contactId: string) => Promise<unknown>
}

export function ContactRow({ contact, onEdit, onSetPrimary, onDelete }: Props) {
  const [starBusy, setStarBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const isPrimary = contact.is_company_main_contact === true
  const locked = contact.has_logged_in === true

  async function handleStar() {
    if (isPrimary || starBusy || locked) return
    setStarBusy(true)
    try {
      await onSetPrimary(contact.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set primary')
    } finally {
      setStarBusy(false)
    }
  }

  async function handleDelete() {
    setDeleteBusy(true)
    try {
      await onDelete(contact.id)
      toast.success('Contact removed')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to delete contact')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="group flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <button
        type="button"
        onClick={handleStar}
        disabled={starBusy || locked}
        aria-label={isPrimary ? 'Primary contact' : 'Set as primary'}
        className={cn(
          'mt-1 shrink-0 transition-colors',
          isPrimary
            ? 'text-amber-500'
            : 'text-muted-foreground/40 hover:text-amber-400 disabled:hover:text-muted-foreground/40'
        )}
      >
        <Star className={cn('h-4 w-4', isPrimary && 'fill-current')} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{contact.full_name || 'Unnamed contact'}</span>
          {locked && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Active account" />}
        </div>
        {contact.job_title && (
          <div className="text-xs text-muted-foreground truncate">{contact.job_title}</div>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground truncate"
          >
            <Mail className="h-3.5 w-3.5" />
            {contact.email}
          </a>
        )}
        {contact.phone_text && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {contact.phone_text}
          </div>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(contact)}
          aria-label="Edit contact"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!locked && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                aria-label="Delete contact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this contact?</AlertDialogTitle>
                <AlertDialogDescription>
                  {contact.full_name || 'This contact'} will be removed from this company. This
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteBusy}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteBusy ? 'Removing...' : 'Remove'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/contacts/contact-row.tsx
git commit -m "feat: add ContactRow component"
```

---

## Task 10: ContactsCard

**Files:**
- Create: `web/src/components/contacts/contacts-card.tsx`

- [ ] **Step 1: Write component**

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { ContactRow } from './contact-row'
import { ContactFormSheet } from './contact-form-sheet'
import { useContacts, type Contact } from './use-contacts'

interface Props {
  companyId: string
}

export function ContactsCard({ companyId }: Props) {
  const { contacts, loading, error, create, update, remove, setPrimary } = useContacts(companyId)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>(undefined)

  function openAdd() {
    setEditing(undefined)
    setSheetOpen(true)
  }

  function openEdit(contact: Contact) {
    setEditing(contact)
    setSheetOpen(true)
  }

  const ordered = [...contacts].sort((a, b) => {
    const aPrimary = a.is_company_main_contact === true
    const bPrimary = b.is_company_main_contact === true
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1
    return (a.full_name ?? '').localeCompare(b.full_name ?? '')
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button variant="ghost" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Failed to load contacts: {error}</p>
        ) : ordered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Users className="h-8 w-8 opacity-40" />
            <span className="text-sm">No contacts yet</span>
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add the first contact
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {ordered.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                onEdit={openEdit}
                onSetPrimary={setPrimary}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ContactFormSheet
        mode={editing ? 'edit' : 'add'}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contact={editing}
        onSubmit={async (input) => {
          if (editing) {
            await update(editing.id, input)
          } else {
            await create(input)
          }
        }}
      />
    </Card>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/contacts/contacts-card.tsx
git commit -m "feat: add ContactsCard component"
```

---

## Task 11: Swap contact cards on supplier detail page

**Files:**
- Modify: `web/src/app/suppliers/[id]/page.tsx`

- [ ] **Step 1: Add import**

Near the other component imports at the top of the file, after the `CreateFirstSheetButton` import, add:

```typescript
import { ContactsCard } from '@/components/contacts/contacts-card'
```

- [ ] **Step 2: Remove derived state and cards**

In the page function body (currently lines 161-169), remove:

```typescript
  const realContacts = contacts.filter(c =>
    c.full_name &&
    c.full_name !== 'Unknown' &&
    !c.email?.includes('placeholder')
  )
  const primaryContact = realContacts.find(c => c.role === 'admin') || realContacts[0]
```

Keep the `completedSheets` / `inProgressSheets` / `pendingSheets` calculations. Also remove `contacts` from the destructure on line 158:

```typescript
  const { company, sheets } = details
```

Remove the Supabase `contacts` fetch in `getSupplierDetails` (lines 109-114) and the `contacts` field from the `SupplierDetails` interface and return value. The contacts are now loaded client-side by `ContactsCard`.

- [ ] **Step 3: Replace the two contact cards**

Replace the entire `<div className="space-y-4">...</div>` block (currently lines 316-369, the two `<Card>` blocks for Primary Contact and Other Contacts) with:

```tsx
          <div className="space-y-4">
            <ContactsCard companyId={company.id} />
          </div>
```

- [ ] **Step 4: Clean up unused imports**

Remove `Mail` from the `lucide-react` import list (it's no longer used on this page). Remove `User` type import if it's now unused.

- [ ] **Step 5: Type-check + build**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Manual verify**

Start dev server, log in as Kalle Luomi (UPM), visit `/suppliers/62217ae4-3e19-4bae-9a64-0b705ca4f5fe`. Expected:
- One "Contacts" card instead of two.
- "+ Add Contact" button works, drawer opens.
- Existing contacts (if any) render with star icon.
- Adding a contact with first/last/email persists after refresh.
- Editing a contact saves.
- Starring a non-primary contact demotes the previous primary.
- Deleting a contact with `has_logged_in = false` removes it; 403 appears for a contact with `has_logged_in = true`.

- [ ] **Step 7: Commit**

```bash
git add web/src/app/suppliers/[id]/page.tsx
git commit -m "feat: wire ContactsCard into supplier detail page"
```

---

## Task 12: Switch list selectors to is_company_main_contact

**Files:**
- Modify: `web/src/app/suppliers/page.tsx:75`
- Modify: `web/src/app/customers/page.tsx:160`

- [ ] **Step 1: Update suppliers list selector**

In `web/src/app/suppliers/page.tsx`, change line 75:

From:
```typescript
    const primaryContact = companyUsers.find(u => u.role === 'admin') || companyUsers[0] || null
```

To:
```typescript
    const primaryContact =
      companyUsers.find(u => u.is_company_main_contact === true) ||
      companyUsers.find(u => u.full_name && u.full_name !== 'Unknown' && !u.email?.includes('placeholder')) ||
      null
```

- [ ] **Step 2: Update customers list selector**

In `web/src/app/customers/page.tsx`, change line 160 similarly:

From:
```typescript
        const primaryContact = companyUsers.find(u => u.role === 'admin') || companyUsers[0] || null
```

To:
```typescript
        const primaryContact =
          companyUsers.find(u => (u as any).is_company_main_contact === true) ||
          companyUsers.find(u => u.full_name && u.full_name !== 'Unknown' && !u.email?.includes('placeholder')) ||
          null
```

(The local `User` interface in this file does not yet include `is_company_main_contact`; the cast is the minimal change. If you prefer, update the interface at lines 23-32 to include `is_company_main_contact?: boolean | null` and drop the `as any`.)

- [ ] **Step 3: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Manual verify**

Visit `/suppliers` and `/customers`. Expected: primary contact column still renders. For any company where you just marked a new primary in Task 11, that contact now appears (not the `role === 'admin'` fallback).

- [ ] **Step 5: Commit**

```bash
git add web/src/app/suppliers/page.tsx web/src/app/customers/page.tsx
git commit -m "feat: use is_company_main_contact as primary-contact source"
```

---

## Task 13: Customer detail page

**Files:**
- Create: `web/src/app/customers/[id]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
import Link from 'next/link'
import { ContactsCard } from '@/components/contacts/contacts-card'

type Company = Database['public']['Tables']['companies']['Row']
type Sheet = Database['public']['Tables']['sheets']['Row']

interface CustomerDetails {
  company: Company
  sheets: Sheet[]
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'approved':
    case 'imported':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      )
    case 'pending':
    case 'flagged':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status === 'flagged' ? 'Flagged' : 'Pending'}
        </Badge>
      )
    case 'draft':
      return <Badge variant="outline">Draft</Badge>
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>
  }
}

async function getCustomerDetails(customerId: string): Promise<CustomerDetails | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!userData?.company_id) return null

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', customerId)
    .single()
  if (!company) return null

  const { data: sheets } = await supabase
    .from('sheets')
    .select('*')
    .eq('company_id', userData.company_id)
    .eq('requesting_company_id', customerId)
    .order('modified_at', { ascending: false })

  return { company, sheets: sheets || [] }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: customerId } = await params
  const details = await getCustomerDetails(customerId)

  if (!details) {
    return (
      <AppLayout title="Customer Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Building2 className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">Customer not found</p>
          <Link href="/customers">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  const { company, sheets } = details
  const completedSheets = sheets.filter(
    (s) => s.status === 'approved' || s.status === 'imported'
  ).length
  const inProgressSheets = sheets.filter((s) => s.status === 'in_progress').length
  const pendingSheets = sheets.filter(
    (s) => s.status === 'pending' || s.status === 'flagged'
  ).length

  return (
    <AppLayout title={company.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{company.name}</h1>
                {company.location_text && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {company.location_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sheets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedSheets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{inProgressSheets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingSheets}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Sheets</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="h-12 w-12 opacity-30" />
                            <span>No product sheets yet</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sheets.map((sheet) => (
                        <TableRow key={sheet.id} className="group">
                          <TableCell>
                            <Link
                              href={`/sheets/${sheet.id}`}
                              className="flex items-center gap-3 group-hover:text-primary"
                            >
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">{sheet.name}</span>
                            </Link>
                          </TableCell>
                          <TableCell>{getStatusBadge(sheet.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {sheet.modified_at
                              ? new Date(sheet.modified_at).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Link href={`/sheets/${sheet.id}`}>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <ContactsCard companyId={company.id} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Manual verify**

Log in as a user at a company that is a supplier to someone else (e.g. Abdessamad at Omya). Visit `/customers`, click a customer row. Expected: customer detail page loads with stats, sheet list, and Contacts card. Add/edit/delete/star flows all work.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/customers/[id]/page.tsx
git commit -m "feat: add customer detail page with contacts"
```

---

## Task 14: End-to-end verification

- [ ] **Step 1: Full build**

```bash
cd stacks/web
npm run build
```

Expected: build succeeds.

- [ ] **Step 2: Manual regression sweep**

Dev server up. As Kalle @ UPM:
- Visit `/suppliers` — table renders, "Primary Contact" column populated for any supplier with an `is_company_main_contact = true` row.
- Open a supplier → Contacts card renders. Add a contact "Test Person / test.person@example.com" → appears. Star another contact → previous primary demoted. Edit the first contact → changes persist. Delete an unprotected contact → removed. Attempt to delete a protected contact (`has_logged_in = true`) → 403 toast.
- Visit `/customers` — table renders.
- Open a customer (new route) → stats + sheets table + Contacts card all render.

As Abdessamad @ Omya:
- Visit `/customers` (Omya is a supplier, UPM appears as a customer). Open UPM → Contacts card loads UPM users. Same CRUD flows.

Verify no 500s in server logs.

- [ ] **Step 3: Final commit (if anything surfaced)**

```bash
git status
# Commit any touch-ups discovered during regression, then:
git commit -m "fix: regression fixes from contacts rollout"
```

If nothing needs fixing, skip this step.

---

## Self-Review Notes

- Spec coverage: every spec requirement maps to a task. Schema → Task 1. `has_logged_in` lock → Tasks 2, 5, 8, 9. API GET/POST/PATCH/DELETE → Tasks 4, 5. Card + drawer + row + hook → Tasks 7-10. Page integration → Tasks 11, 12, 13.
- No placeholders in code blocks. Every file, function, field name used downstream is defined upstream.
- Method names consistent: `setPrimary`, `remove`, `create`, `update` across hook + card + row.
- Out-of-scope items from spec explicitly not implemented (no bulk import, no resend-invite, no per-sheet contact assignment).

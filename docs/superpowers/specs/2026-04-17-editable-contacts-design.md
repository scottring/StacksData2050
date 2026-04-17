# Editable Contacts on Supplier and Customer Detail Pages

**Date:** 2026-04-17
**Status:** Approved design, ready for implementation planning

## Problem

The supplier detail page (`/suppliers/[id]`) and its mirror on the customer side surface a read-only "Primary Contact" card that is empty for most companies because primary designation is computed with a heuristic (`role === 'admin'` fallback to first contact). There is no way to add a contact, edit an existing one, or designate a specific person as primary. Adding someone today requires a direct database edit or creating an auth user through another path.

## Goal

Turn the Primary Contact card into a unified, editable "Contacts" surface on both supplier and customer detail pages. Let any user at the requesting company add, edit, delete, and designate a primary contact at a supplier/customer company through a clean UI, with safeguards against overwriting records belonging to contacts who have logged in.

## Model

Contacts remain rows in the `users` table (the platform's historical model: every contact is an authorized user). No new contacts table. New CRM-style fields are added to `users` and an existing-but-unused boolean flag becomes the primary-contact source of truth.

### Schema changes

Migration adds two columns to `users`:

- `job_title TEXT NULL`
- `has_logged_in BOOLEAN NOT NULL DEFAULT false` — flipped to `true` the first time the user establishes an authenticated session. Implementation: server-side bump in the auth callback / middleware path that already runs on login. This is the lock signal for edits and deletes.

`is_company_main_contact` (already on `users`, not currently read) becomes the primary-contact source of truth. Exactly zero or one contact per company should have this set to `true` (enforced at the API layer, not DB).

All existing heuristics across pages switch to: `primary = contacts.find(c => c.is_company_main_contact) ?? contacts[0] ?? null`, with the same placeholder filtering used today (`full_name !== 'Unknown'`, email not containing `placeholder`).

## API

All endpoints live under `/api/companies/[id]/contacts`, use the service-role client (per existing pattern in `stacks/CLAUDE.md` on cross-tenant queries), and require an authenticated session. Each mutation route verifies the caller's `company_id` and that the caller's company has a real relationship with the target company — defined as at least one `sheets` row where the caller's company is on one side and `:id` is on the other, or a row in `requests` linking them. Any user at the requesting company may act (no admin gating).

- **`GET /api/companies/[id]/contacts`** — extend the existing route to include `phone_text`, `job_title`, `is_company_main_contact`, `has_logged_in` in the selected columns.
- **`POST /api/companies/[id]/contacts`** — create a contact.
  Body: `{ first_name, last_name, email, phone_text?, job_title?, is_primary?, send_invite? }`.
  - Validates email format and uniqueness within the target company (returns `409` on duplicate).
  - If `is_primary === true`, demotes any existing primary at the target company in the same transaction.
  - If `send_invite === true`, calls Supabase Auth `admin.inviteUserByEmail` after the row is created. If the invite call fails, the contact is still persisted; response includes `invite_sent: false`.
- **`PATCH /api/companies/[id]/contacts/[contactId]`** — update fields.
  - Returns `403` if the contact's `has_logged_in === true` (lock-after-login).
  - If the body sets `is_primary: true`, demotes the current primary in the same transaction.
- **`DELETE /api/companies/[id]/contacts/[contactId]`** — hard-delete the user row.
  - Returns `403` if `has_logged_in === true`.
  - Otherwise removes the row. (Placeholder/migrated ghosts with `has_logged_in = false` are safe to delete.)

## UI

### Unified "Contacts" card

Replace the two separate cards on the supplier detail page (Primary Contact + Other Contacts, lines 316-368 of `web/src/app/suppliers/[id]/page.tsx`) with a single card titled "Contacts." Add the same card to the customer detail page.

Layout:

- Card header: title "Contacts" on the left, "+ Add Contact" button on the right.
- Card body: one row per contact, primary first. Each row shows:
  - Full name (first + last) in medium weight.
  - Email beneath in muted text, with a `mailto:` link.
  - Phone and job title on a second muted line when present.
  - A star icon on the far left: solid/gold when this contact is primary, outline/muted otherwise. Click toggles primary (optimistic).
  - On hover: Edit and Delete icon buttons on the right.
- Locked contacts (those where `has_logged_in === true`) display a small lock icon and their row actions are disabled (Delete hidden, Edit opens a read-only view with a banner).

### Contact form drawer

One shadcn `Sheet` drawer component handles both add and edit. Slides in from the right.

Fields, in order:

- First name (required)
- Last name (required)
- Email (required, validated format)
- Phone (optional)
- Job title (optional)
- "Set as primary contact" toggle
- Add-mode only: "Send invitation email now" checkbox, default unchecked.

Edit-mode on a locked contact: all fields `disabled`, save button hidden, amber banner at top reads "This contact has an active account — they manage their own profile."

Validation surfaces inline under each field. A failed save shows a toast and leaves the drawer open with values retained.

### Component layout

All new files under `web/src/components/contacts/`:

- `ContactsCard.tsx` (client) — the unified card. Props: `companyId`. Fetches via SWR, renders list, owns the drawer open/close state.
- `ContactFormSheet.tsx` (client) — the drawer. Props: `mode`, `contact?`, `companyId`, `open`, `onOpenChange`, `onSaved`.
- `ContactRow.tsx` (client) — a single row with star toggle, edit/delete actions.
- `useContacts.ts` — SWR hook wrapping the API. Exposes `contacts`, `mutate`, `create`, `update`, `remove`, `setPrimary`.

## Integration points

### Files that change

- `web/src/app/suppliers/[id]/page.tsx` — remove `primaryContact`/`realContacts` computation and the two contact cards. Add `<ContactsCard companyId={company.id} />` in their place.
- `web/src/app/customers/[id]/page.tsx` — does not exist yet. Created as part of this work, mirroring the structure of `suppliers/[id]/page.tsx`: header with company name/logo/location, stats row (sheets requested / completed / pending / last activity), sheets table, and the new `<ContactsCard />`. The customers list rows currently route to `/customers/${id}` on click (no destination today); this change gives them one.
- `web/src/app/suppliers/page.tsx` — change `primaryContact = companyUsers.find(u => u.role === 'admin')` to `.find(u => u.is_company_main_contact)`, same fallback.
- `web/src/app/customers/page.tsx` — same selector change.
- `web/src/app/api/companies/[id]/contacts/route.ts` — extend selected fields in GET; add POST handler.

### New files

- Migration for `users` table schema additions.
- `web/src/app/customers/[id]/page.tsx` — customer detail page mirroring the supplier detail page.
- `web/src/app/api/companies/[id]/contacts/[contactId]/route.ts` — PATCH and DELETE handlers.
- The four component files above.

### Files that do not change

- `suppliers-list.tsx` and `customers-list.tsx` — they render whatever the parent passes in. No UI change needed in the list row; just a different selector upstream.

## State flow

1. `ContactsCard` mounts → SWR fetches `/api/companies/[id]/contacts` → renders the list.
2. User clicks "+ Add Contact" → drawer opens in `add` mode with blank form.
3. User clicks Edit on a row → drawer opens in `edit` mode with the contact pre-filled.
4. User saves → POST or PATCH → on 2xx, SWR revalidates, drawer closes, toast confirms.
5. User clicks the star icon on a non-primary row → optimistic local update, PATCH with `is_primary: true`, server demotes previous primary in one transaction, SWR revalidates.
6. User clicks Delete → AlertDialog confirms → DELETE → SWR revalidates on 2xx; 403 shows a toast explaining the lock.

## Error handling

- `403` on edit or delete → toast: "This contact has an active account and must edit their own profile."
- `409` on duplicate email → inline email-field error + toast.
- Network failure → toast, drawer stays open, values retained.
- Invite email failure on add → contact is created anyway; toast: "Contact saved, but the invitation email failed to send."

## Testing

- **Unit:** `ContactFormSheet` validation (required first/last/email, email format); locked-state rendering disables inputs and hides Save.
- **API:** happy-path create/update/delete; 403 on `has_logged_in` locked contact; primary toggle demotes existing primary atomically; duplicate-email 409; cross-tenant permission check rejects users with no real relationship to the target company.
- **Manual:** both supplier and customer detail pages; suppliers and customers list pages reflect new primary flag; invite checkbox sends an actual email in dev environment; locked row cannot be deleted; add-then-mark-primary flow demotes the previous primary.

## Out of scope

- Bulk contact import (CSV upload).
- Per-sheet contact assignment ("send this sheet's notifications to these contacts").
- Admin-only permission gating on edits — anyone at the requesting company may edit, per Q4.
- A "Resend invitation" button on pending contacts — worth adding next iteration.
- Tightening the heuristic-fallback on list pages beyond swapping the selector (placeholder filtering stays as-is).

## Open questions

None. All design decisions were resolved during brainstorming.

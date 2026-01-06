# Supplier Invitation & Assignment Feature Plan

**Version:** 1.0
**Last Updated:** December 25, 2024
**Status:** Analysis Complete - Ready for Implementation Planning

---

## Executive Summary

Supplier invitation is a **critical workflow** in Stacks Data that bridges the customer-supplier relationship. Based on analysis of the existing Bubble database (now migrated to Supabase), this document details the complete invitation, assignment, and collaboration model.

---

## 1. Data Model Analysis (From Existing System)

### 1.1 Key Tables Involved

| Table | Purpose | Record Count |
|-------|---------|--------------|
| `users` | User accounts with invitation tracking | 337 |
| `companies` | Company entities (customers & suppliers) | 132 |
| `sheets` | Product data sheets (questionnaire instances) | 1,649 |
| `sheet_supplier_users_assigned` | Links users to sheets they can edit | ~280 |
| `sheet_shareable_companies` | Links sheets to customer companies | ~870+ |
| `answers` | Questionnaire responses | 367,476 |
| `tags` | Question bundles/categories | 26 |
| `question_tags` | Links questions to tags | ~505 |
| `sheet_tags` | Tags selected for each sheet request | ~1,647 |

---

## 2. Tags: The Core Request Mechanism

### 2.1 What Are Tags?

**Tags are bundles of questions that customers select when requesting data from suppliers.** This is the primary mechanism for defining what questions a supplier needs to answer.

### 2.2 Standard Tags (Shared Across All Customers)

| Tag Name | Question Count | Purpose |
|----------|----------------|---------|
| HQ 2.0.1 | 166 | Core chemical questionnaire (v2.0.1) |
| HQ2.1 | 152 | Updated core questionnaire (v2.1) |
| Food Contact | 67 | Food contact compliance questions |
| PIDSL | 33 | Product Ingredient Data Sheet List |
| Additional Reqs | 31 | Supplementary requirements |
| Ecolabels | 20 | Environmental certification questions |
| Biocides | 16 | Biocide regulation compliance |
| Biocides-2.1 | 10 | Updated biocide questions |
| General | 4 | General product information |
| Feedback | 5 | Supplier feedback questions |

### 2.3 Custom Tags (Customer-Specific)

Customers can create their own tags with custom questions:

| Tag Name | Owner | Purpose |
|----------|-------|---------|
| Mercosur additional questions-UPM | UPM | Regional compliance for South America |
| AddMyOwn-UPM | UPM | Custom questions unique to UPM |
| XXX-SAPPI | Sappi | Custom questions for Sappi |

**Custom Tag Visibility Controls:**
- `custom_active`: Is the tag currently in use?
- `custom_any_can_see`: Can all suppliers see this tag?
- `custom_only_if_requested_or_shared`: Only visible when specifically requested

### 2.4 Tag Usage on Sheets

| Tags per Sheet | Number of Sheets | Description |
|----------------|------------------|-------------|
| 1 tag | 1,356 (82%) | Simple request (usually just HQ 2.0.1 or HQ2.1) |
| 5 tags | 188 (11%) | Comprehensive multi-topic request |
| 2-4 tags | 55 (3%) | Moderate complexity |
| 6-8 tags | 48 (3%) | Full regulatory compliance |

**Example Multi-Tag Sheet:** "Dispelair DP 362"
- General (basic info)
- Food Contact (food safety)
- PIDSL (ingredient data)
- Biocides (biocide compliance)
- Additional Reqs (extra questions)

---

## 3. The Complete Request Flow

### 3.1 Customer Creates Request (The Real Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER REQUEST WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Customer selects SUPPLIER COMPANY                               │
│     (search existing or create new)                                 │
│                           ↓                                         │
│  2. Customer enters PRODUCT NAME                                    │
│     (e.g., "Dispelair DP 362")                                      │
│                           ↓                                         │
│  3. Customer selects TAG(S) to include                              │
│     ☑ HQ2.1 (152 questions)                                         │
│     ☑ Food Contact (67 questions)                                   │
│     ☐ Biocides (16 questions)                                       │
│     ☐ PIDSL (33 questions)                                          │
│                           ↓                                         │
│  4. System creates SHEET with:                                      │
│     - sheet.name = product name                                     │
│     - sheet.company_id = supplier company                           │
│     - sheet_tags = selected tags                                    │
│     - sheet_shareable_companies = requesting customer               │
│                           ↓                                         │
│  5. Customer specifies SUPPLIER CONTACT(S)                          │
│     - Email address(es)                                             │
│     - Optional message                                              │
│                           ↓                                         │
│  6. System sends INVITATION                                         │
│     - Creates user if new                                           │
│     - Assigns user to sheet                                         │
│     - Sends email notification                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 What Supplier Sees

When supplier opens the sheet, they see:
- Product name at top
- Questions from ALL selected tags, organized by section
- Total question count = sum of questions in all selected tags
- Progress tracker showing completion %

### 3.3 Customer-Supplier Relationships

**Top Customers by Sheets Shared:**

| Customer | Sheets Shared With Them |
|----------|------------------------|
| UPM | 410 |
| Sappi | 170 |
| Saica | 165 |
| MM Board & Paper | 68 |
| Visy | 14 |
| Stora Enso | 6 |

---

## 2. The Two-Phase Invitation Model

### 2.1 Phase 1: User Invitation to Platform

**Existing Fields on `users` Table:**
```
- invitation_sent: boolean         -- Has an invitation email been sent?
- self_sign_up_invitation_code: text -- Unique code for self-service signup
- user_type: text                  -- Permission level
```

**Invitation Methods:**

| Method | Implementation |
|--------|---------------|
| **Email Invitation** | Set `invitation_sent = true`, send email with magic link |
| **Self-Signup Code** | Generate `self_sign_up_invitation_code`, share link |
| **Company Admin Adds** | Admin creates user directly in their company |

### 2.2 Phase 2: Sheet Assignment to User

**After a user exists**, they must be assigned to specific sheets:

**`sheet_supplier_users_assigned` Junction Table:**
```sql
sheet_id: uuid   -- The sheet to work on
user_id: uuid    -- The user who can access it
```

**Assignment Log (on `sheets` table):**
```
supplier_assignment_log: text[]  -- Array of assignment history entries
```

Example log entry:
```
"Email was sent to florencia.pedraza@ecolab.com with sheet assignment
by florencia.pedraza@ecolab.com Note: Please see the questionary we
received from UPM about positek 9010. on Thursday, May 22, 2025"
```

---

## 3. Complete Invitation Flow

### 3.1 Customer Initiates Request

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Customer creates/selects questionnaire template (Stack)         │
│                           ↓                                         │
│  2. Customer creates Sheet for specific product                     │
│                           ↓                                         │
│  3. Customer selects supplier company to assign                     │
│                           ↓                                         │
│  4. Sheet gets linked to supplier via:                              │
│     - sheets.assigned_to_company_id = supplier_company_id           │
│     - sheet_shareable_companies (customer can view responses)       │
│                           ↓                                         │
│  5. Customer invites supplier user(s) to respond                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Supplier User Scenarios

#### Scenario A: New Supplier (Company doesn't exist)

```
1. Customer enters supplier email + company name
2. System creates:
   - New company record
   - New user record with invitation_sent = true
   - Sheet assignment
3. Email sent with signup link
4. Supplier clicks link → Creates password → Sees assigned sheet
```

#### Scenario B: Existing Supplier Company, New User

```
1. Customer enters email for user at known supplier company
2. System checks: email domain matches existing company?
3. Creates user linked to existing company
4. Assigns user to specific sheet(s)
5. Email sent with invitation
```

#### Scenario C: Existing Supplier User, New Sheet

```
1. Customer creates new sheet for existing supplier company
2. Assigns sheet to specific user(s) at that company
3. Notification sent to assigned users
4. User sees new sheet in their dashboard
```

### 3.3 Internal Supplier Delegation

Supplier companies can internally delegate sheet completion:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPPLIER INTERNAL WORKFLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Supplier admin (Company Edit) receives sheet assignment         │
│                           ↓                                         │
│  2. Admin assigns sheet to specific team member(s)                  │
│     via sheet_supplier_users_assigned                               │
│                           ↓                                         │
│  3. System logs: "Email was sent to [email] with sheet              │
│     assignment by [assigner] Note: [message] on [date]"             │
│                           ↓                                         │
│  4. Assigned user receives notification                             │
│                           ↓                                         │
│  5. Multiple users can be assigned (view/edit permissions)          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Requirements

### 4.1 Customer-Side: Invite Supplier

**FR-SI-001: Supplier Search/Create**
```
GIVEN customer wants to request data from a supplier
WHEN they enter supplier details
THEN system should:
  - Search existing companies by name/domain
  - Suggest matches to avoid duplicates
  - Allow creating new company if none match
  - Validate email format
```

**FR-SI-002: Multi-User Assignment**
```
GIVEN a sheet needs to be assigned to a supplier company
WHEN customer sends the request
THEN system should:
  - Allow specifying multiple recipient emails
  - Differentiate primary contact vs CC
  - Track which user is responsible for completion
```

**FR-SI-003: Invitation Email**
```
Email should include:
- Customer company name + logo
- Product name (sheet name)
- Questionnaire name
- Optional message from customer
- Clear CTA button
- Expiration notice
- Support contact
```

**FR-SI-004: Bulk Import**
```
GIVEN customer has many suppliers to invite
WHEN they upload CSV with:
  - Company name (required)
  - Contact email (required)
  - Contact name (optional)
  - Products to assign (optional)
THEN system should:
  - Validate data
  - Create companies/users as needed
  - Queue invitations
  - Report success/failures
```

### 4.2 Supplier-Side: Receive & Delegate

**FR-SI-010: First-Time User Onboarding**
```
GIVEN user clicks invitation link for first time
WHEN they arrive at the platform
THEN they should:
  1. See clear context (who invited, for what)
  2. Create account (password, basic info)
  3. Be auto-associated with correct company
  4. Land directly on assigned sheet
  5. Start answering immediately
```

**FR-SI-011: Internal Delegation**
```
GIVEN supplier admin has sheet to complete
WHEN they want to delegate to team member
THEN they should:
  1. Search/add user from their company
  2. Assign with permission level (edit/view)
  3. Add optional note explaining task
  4. Trigger notification to assignee
  5. See assignment in sheet activity log
```

**FR-SI-012: Multi-User Collaboration**
```
GIVEN multiple users are assigned to same sheet
WHEN they work on it
THEN system should:
  - Allow concurrent editing (no lock-out)
  - Show who made each change
  - Auto-save with conflict resolution
  - Show real-time status of completion
```

### 4.3 Status Tracking

**FR-SI-020: Sheet Status Workflow**

```
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌────────────┐
│ Assigned │ ──► │ In Progress│ ──► │ Submitted    │ ──► │ Accepted   │
└──────────┘     └────────────┘     └──────────────┘     └────────────┘
                       │                    │                    │
                       │                    │                    │
                       ▼                    ▼                    ▼
                 ┌──────────┐        ┌───────────┐       ┌──────────┐
                 │ Reminder │        │ Rejected  │       │ Archived │
                 │   Sent   │        │(needs fix)│       │          │
                 └──────────┘        └───────────┘       └──────────┘
```

**FR-SI-021: Reminder System**
```
Automated reminders based on:
- Days since assignment
- Days until due date
- Configurable schedule (3, 7, 14 days)
- Max reminders (default 3)
- Track reminder_count on sheet_statuses
```

---

## 5. Data Architecture

### 5.1 New/Modified Tables

**`invitations` Table (New)**
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,  -- 'supplier_to_platform', 'sheet_assignment'

  -- Who
  inviter_user_id UUID REFERENCES users(id),
  invitee_email TEXT NOT NULL,
  invitee_user_id UUID REFERENCES users(id),  -- NULL until accepted

  -- What
  company_id UUID REFERENCES companies(id),   -- Target company
  sheet_id UUID REFERENCES sheets(id),        -- Optional: specific sheet

  -- Status
  status TEXT DEFAULT 'pending',  -- pending, accepted, expired, declined
  token TEXT UNIQUE NOT NULL,     -- URL token
  message TEXT,                   -- Optional note from inviter

  -- Timing
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**`sheet_assignments` Table (Enhanced Junction)**
```sql
CREATE TABLE sheet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Assignment details
  assigned_by_user_id UUID REFERENCES users(id),
  permission TEXT DEFAULT 'edit',  -- 'edit', 'view'
  note TEXT,

  -- Status tracking
  is_primary BOOLEAN DEFAULT false,  -- Primary responsible user
  notification_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(sheet_id, user_id)
);
```

### 5.2 Migration from Existing Structure

```sql
-- Migrate from sheet_supplier_users_assigned
INSERT INTO sheet_assignments (sheet_id, user_id, permission, is_primary)
SELECT
  sheet_id,
  user_id,
  'edit',
  ROW_NUMBER() OVER (PARTITION BY sheet_id ORDER BY sheet_id) = 1
FROM sheet_supplier_users_assigned;

-- Parse supplier_assignment_log into activity_log table
-- (Complex: requires parsing text array entries)
```

---

## 6. API Endpoints

### 6.1 Invitation APIs

```typescript
// Customer invites supplier
POST /api/invitations/supplier
Body: {
  email: string,
  company_name?: string,  // For new companies
  company_id?: string,    // For existing companies
  sheet_ids?: string[],   // Optional: assign sheets immediately
  message?: string
}

// Accept invitation
POST /api/invitations/:token/accept
Body: {
  password: string,       // For new users
  first_name: string,
  last_name: string
}

// Supplier assigns sheet to team member
POST /api/sheets/:sheetId/assign
Body: {
  user_id?: string,       // Existing user
  email?: string,         // Or invite by email
  permission: 'edit' | 'view',
  note?: string
}

// Get sheet assignees
GET /api/sheets/:sheetId/assignees
Response: {
  assignees: [
    { user: User, permission: string, is_primary: boolean }
  ]
}
```

### 6.2 Status APIs

```typescript
// Update sheet status
PATCH /api/sheets/:sheetId/status
Body: {
  status: 'in_progress' | 'submitted' | 'accepted' | 'rejected',
  note?: string
}

// Get invitation status
GET /api/invitations?company_id=xxx
Response: {
  pending: [...],
  accepted: [...],
  expired: [...]
}
```

---

## 7. UI Components Required

### 7.1 Customer Side

| Component | Purpose |
|-----------|---------|
| `SupplierInviteModal` | Search/create supplier and send invitation |
| `BulkImportWizard` | CSV upload with validation and preview |
| `SupplierStatusList` | Track invitation and response status |
| `SheetAssignmentPanel` | View/manage who's assigned to a sheet |
| `ReminderConfigPanel` | Configure automated reminder schedule |

### 7.2 Supplier Side

| Component | Purpose |
|-----------|---------|
| `OnboardingFlow` | Multi-step onboarding for new users |
| `DelegationModal` | Assign sheets to team members |
| `TeamMemberPicker` | Select from company users or invite new |
| `SheetActivityLog` | View assignment and edit history |
| `NotificationCenter` | View pending invitations and assignments |

---

## 8. Email Templates

### 8.1 Invitation Emails

| Template | Trigger | Key Content |
|----------|---------|-------------|
| `supplier-invitation-new` | New supplier invited | "You've been invited by {customer}" |
| `supplier-invitation-existing` | Existing user, new customer | "New questionnaire request from {customer}" |
| `sheet-assignment` | Internal delegation | "{admin} assigned you to {sheet}" |
| `reminder-first` | Day 3 after assignment | "Reminder: {sheet} needs your response" |
| `reminder-second` | Day 7 | "Second reminder: {sheet} awaiting response" |
| `reminder-final` | Day 14 | "Final reminder: {sheet} overdue" |
| `status-submitted` | Supplier submits | "Your submission has been received" |
| `status-accepted` | Customer accepts | "Your submission was accepted" |
| `status-rejected` | Customer rejects | "Your submission needs revision" |

---

## 9. Implementation Phases

### Phase 1: Core Invitation (MVP)
- [ ] Basic email invitation flow
- [ ] New user onboarding
- [ ] Automatic company/user creation
- [ ] Sheet assignment on invite
- [ ] Accept invitation → land on sheet

### Phase 2: Enhanced Collaboration
- [ ] Internal delegation (supplier side)
- [ ] Multi-user assignment
- [ ] Activity/assignment log
- [ ] Permission levels (edit/view)

### Phase 3: Automation & Scale
- [ ] Bulk CSV import
- [ ] Automated reminder system
- [ ] Status workflow automation
- [ ] Notification preferences
- [ ] Analytics dashboard

### Phase 4: Enterprise Features
- [ ] SSO integration for invitations
- [ ] Custom email templates
- [ ] Approval workflows
- [ ] SLA tracking
- [ ] Integration webhooks

---

## 10. Security Considerations

### 10.1 Invitation Security
- Tokens should be UUID v4 + crypto random bytes
- Tokens expire after 30 days (configurable)
- Rate limit invitation sends (10/hour per user)
- Validate email domain matches company (optional)

### 10.2 RLS Policies
```sql
-- Users can only see invitations they sent or received
CREATE POLICY invitation_access ON invitations
FOR ALL USING (
  inviter_user_id = auth.uid()
  OR invitee_user_id = auth.uid()
  OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Users can only see sheet assignments for their company
CREATE POLICY assignment_access ON sheet_assignments
FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = sheet_id
    AND s.company_id = public.get_my_company_id()
  )
);
```

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Invitation acceptance rate | >70% | Accepted / Sent |
| Time to first response | <3 days | Created → First answer |
| Onboarding completion rate | >85% | Completed / Started |
| Sheet completion rate | >80% | Submitted / Assigned |
| Reminder effectiveness | -20% reminders needed | Month-over-month |

---

## Appendix: Existing Data Samples

### Sample Supplier Assignment Log Entry
```
"Email was sent to jhartikainen@ecolab.com with sheet assignment
by jhartikainen@ecolab.com Note: Dear Product Stewardship team,
Please see the questionary we received from UPM about positek 9010.
Could you please reply this request and fill needed data.
Thanks for your help, Joni on Thursday, May 22, 2025"
```

### Sample User Types Distribution
```
Supplier user can edit: 171 (50.9%)
Company Edit:           131 (39.0%)
Supplier user view only:   3 (0.9%)
Company View Only:         1 (0.3%)
System Grand admin:        1 (0.3%)
Null/Not set:             30 (8.9%)
```

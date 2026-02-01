# Stacks Data Trial — Remaining Tasks

**Trial Date:** February 2, 2026
**Confirmed Companies:** 8

---

## 1. Landing Page (`/trial` or `/welcome`)

**Purpose:** First thing trial users see after clicking email link. Sets the tone.

**Requirements:**
- Clean, professional design matching app aesthetic
- Personalized greeting (if possible, or generic "Welcome to Stacks Data")
- Clear sign-in button (prominent)
- Brief value prop (1-2 sentences)
- "What you can do" section (3-4 bullet points):
  - View your company's historical compliance data
  - Send and receive product information requests
  - Import existing Excel workbooks
  - Create custom questions for your suppliers
- Link to quick-start guide (PDF or `/docs/getting-started`)
- Optional: embedded 2-min walkthrough video

**File:** `src/app/trial/page.tsx` or `src/app/welcome/page.tsx`

**Notes:** 
- Should work for unauthenticated users (public page)
- After sign-in, redirect to dashboard

---

## 2. Welcome Email Template

**Purpose:** Sent to each trial participant with their credentials/invite.

**Content needs:**
- Subject line: "Welcome to the Stacks Data Trial"
- Warm greeting with their name
- What Stacks Data is (1 sentence)
- Their login email
- Big CTA button: "Sign In to Stacks Data →" (links to landing page or direct login)
- What to try first (2-3 things)
- Support contact (Scott's email)
- Trial end date if applicable

**Implementation options:**
- Use existing email infrastructure (Supabase auth emails?)
- Or create `/api/trial/send-welcome` endpoint
- Or manual send via email client with HTML template

**Deliverable:** HTML email template (can be used in any sender)

---

## 3. Quick-Start Guide

**Purpose:** Saica specifically asked for a user manual. Others will want it too.

**Format:** PDF or in-app page (`/docs/getting-started`)

**Content outline:**
1. **Signing In** — How to access your account
2. **Dashboard Overview** — What you see when you log in
3. **Viewing Your Data** — Finding your company's historical sheets
4. **Sending a Request** (for customers)
   - Select supplier
   - Choose question tags
   - Add custom questions
   - Send
5. **Responding to a Request** (for suppliers)
   - Find pending requests
   - Fill out the sheet
   - Submit for review
6. **Importing Excel Workbooks**
   - Go to /import
   - Upload HQ 2.1 workbook
   - Review and confirm
7. **Creating Custom Questions** (for customers)
   - Settings → Custom Questions
   - Add question, choose type
   - Include in requests
8. **Getting Help** — Contact info

**Deliverable:** Markdown file that can be rendered as page or exported to PDF

---

## 4. User Account Setup

**Purpose:** Ensure trial users can log in and see their company data.

**For each confirmed company, verify:**
- [ ] Company exists in `companies` table
- [ ] User account exists in `auth.users` 
- [ ] User linked to correct company (`users.company_id`)
- [ ] User can see historical sheets (RLS working)

**Confirmed companies (8):**
1. Solenis — mkokowska@solenis.com
2. P&P VIS Admin — vrazitorovic@vci.de
3. Omya — abdessamad.arbaoui@omya.com
4. Kemira — tiia.aho@kemira.com
5. Saica — jorge.garcia@saica.com (+ 3 more users)
6. UPM — kaisa.herranen@upm.com (+ 2 more users)
7. MM Group — Sigrid.Gerold@mm.group (+ 2 more users)
8. Woellner — dominik.stumm@woellner.de

**Script needed:** `scripts/setup-trial-users.ts`
- Input: list of {email, company_name}
- Check if company exists, create if not
- Check if user exists, create invite if not
- Link user to company
- Output: summary of what was created/linked

---

## 5. Final Testing Checklist

Run through these on production (beta.stacksdata.com):

**Authentication:**
- [ ] Can sign up with invite link
- [ ] Can sign in with existing account
- [ ] Password reset works

**Core Flow:**
- [ ] Dashboard loads with company data
- [ ] Can view historical sheets
- [ ] Can create new request
- [ ] Supplier receives email notification
- [ ] Supplier can fill sheet
- [ ] Supplier can submit
- [ ] Customer can review
- [ ] Customer can approve/request changes

**Excel Import:**
- [ ] Upload test workbook at /import
- [ ] Preview shows correct data
- [ ] Import creates sheet with answers

**Custom Questions:**
- [ ] Can create custom question in Settings
- [ ] Custom question appears in request creation
- [ ] Supplier sees custom question on sheet
- [ ] Answer saves correctly

**RLS:**
- [ ] User A cannot see User B's company data
- [ ] Sheets only visible to involved companies

---

## Priority Order

1. **User Account Setup** (blocking — users can't log in without this)
2. **Landing Page** (first impression)
3. **Welcome Email** (how they get the link)
4. **Quick-Start Guide** (reduces support burden)
5. **Final Testing** (catch issues before users do)

---

## Files to Create

```
src/app/trial/page.tsx          # Landing page
src/app/docs/getting-started/page.tsx  # Quick-start guide
scripts/setup-trial-users.ts    # User provisioning script
emails/trial-welcome.html       # Email template
```

---

## Environment Notes

- **App URL:** https://beta.stacksdata.com
- **Project location:** `~/Developer/StacksData2050/stacks/web` (on MacBook Pro)
- **Supabase project:** `yrguoooxamecsjtkfqcw`

# Demo Setup Notes (January 14, 2026)

## Summary
We switched from the `demo-prep` worktree branch back to `main` because sheets weren't displaying answers correctly on the demo-prep branch. We copied over the new reports we created.

---

## What Was Done

### 1. Switched from demo-prep to main branch
- **Problem:** Sheets on `demo-prep` branch weren't showing answers
- **Solution:** Switched to `main` branch (in `/Users/scottkaufman/Developer/StacksData2050/stacks/web`)
- **Result:** Sheets now display answers correctly

### 2. Copied New Reports to Main Branch
The following report pages were created on demo-prep and copied to main:

| Report | Path | Description |
|--------|------|-------------|
| Reports Hub | `/reports` | Main reports page with cards linking to all reports |
| Supplier Compliance | `/reports/supplier-compliance` | Compliance rates by supplier |
| Executive Dashboard | `/reports/executive` | High-level metrics, health score, status breakdown |
| Chemical Inventory | `/reports/chemical-inventory` | Searchable chemical/CAS entries from questionnaires |
| Overdue Submissions | `/reports/overdue` | Sheets not updated in 7+ days |
| Supplier Trends | `/reports/trends` | Performance trends, quality scores, response times |
| Regulatory Impact | `/reports/regulatory` | Regulatory compliance areas and upcoming changes |

### 3. Added Progress Component
- Created: `src/components/ui/progress.tsx`
- Installed: `npm install @radix-ui/react-progress`

### 4. Key Fix in Reports
Changed all reports to use `assigned_to_company_id` instead of `company_id` when querying sheets by supplier. This ensures the supplier shown in reports matches what appears on the supplier detail page.

---

## Current Working Directory
**Use this directory for the demo:**
```
/Users/scottkaufman/Developer/StacksData2050/stacks/web
```

**Dev server:** http://localhost:3000

---

## TODO: Create Supabase Demo Branch

Before the demo, create an isolated database branch so you can safely approve/flag/edit without affecting production:

1. Go to: https://supabase.com/dashboard/project/yrguoooxamecsjtkfqcw/branches
2. Click "Create branch"
3. Name it: `demo-branch`
4. Wait ~1-2 minutes
5. Copy the new branch URL and anon key
6. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<branch-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<branch-anon-key>
   ```
7. Restart dev server: `npm run dev`

---

---

## Enterprise Integrations Feature (NEW)

Showcase connectivity with enterprise systems like SAP, Oracle, Salesforce, and PLM tools.

**Demo URL:** http://localhost:3000/integrations

**Key features shown:**
- Pre-built connectors for major enterprise systems:
  - ERP: SAP S/4HANA, Oracle Cloud
  - CRM: Salesforce
  - PLM: PTC Windchill, Siemens Teamcenter
  - Compliance: IHS Markit, Sphera
  - Data: Excel import/export, REST API
- Connection status indicators (Connected, Available, Coming Soon)
- Feature badges showing sync capabilities
- REST API documentation preview with endpoints
- Security compliance (SOC 2)

**Key talking points:**
- "Stacks integrates with your existing enterprise systems"
- "No data silos - compliance data flows to SAP, Oracle, etc."
- "Real-time sync keeps all systems up to date"
- "Full REST API for custom integrations"
- "SOC 2 compliant for enterprise security requirements"

---

## Custom Question Feature (NEW)

Manufacturers can create their own custom compliance questions.

**Demo flow:**
1. Go to: http://localhost:3000/questions
2. Click "Add Custom Question" button (top right)
3. Fill in:
   - Question text (e.g., "Does this product contain any recycled materials?")
   - Question type (Text, Yes/No, Number, etc.)
   - Section (which compliance area)
   - Required checkbox
4. Click "Create Question"
5. Question appears in the list immediately

**Key talking points:**
- Manufacturers can customize questionnaires for their specific compliance needs
- Questions are categorized by section (Food Contact, Regulatory, etc.)
- Supports multiple question types for different data collection needs
- Required questions ensure suppliers provide critical information

---

## Demo URLs

### Core Functionality
- **Sheets List:** http://localhost:3000/sheets
- **Sheet Detail (with answers):** http://localhost:3000/sheets/[id]
- **Review Page:** http://localhost:3000/sheets/[id]/review
- **Questions (Custom Questions):** http://localhost:3000/questions
- **Integrations:** http://localhost:3000/integrations
- **Customers:** http://localhost:3000/customers
- **Suppliers:** http://localhost:3000/suppliers

### Reports
- **Reports Hub:** http://localhost:3000/reports
- **Supplier Compliance:** http://localhost:3000/reports/supplier-compliance
- **Executive Dashboard:** http://localhost:3000/reports/executive
- **Chemical Inventory:** http://localhost:3000/reports/chemical-inventory
- **Overdue Submissions:** http://localhost:3000/reports/overdue
- **Supplier Trends:** http://localhost:3000/reports/trends
- **Regulatory Impact:** http://localhost:3000/reports/regulatory

### Submitted Sheets for Review Demo
- Bandisp 141: http://localhost:3000/sheets/e30e5fa3-62bf-4f50-9a02-86811ed9a8a7/review
- Nalco 74838: http://localhost:3000/sheets/a53fd214-1df9-4bc1-829a-d80784acbbc7/review
- FennoSan GL 10: http://localhost:3000/sheets/b35e8002-adbf-4dd7-bde6-b46af75601d7/review

---

## Files Changed on Main Branch

New files added:
- `src/app/reports/page.tsx`
- `src/app/reports/supplier-compliance/page.tsx`
- `src/app/reports/executive/page.tsx`
- `src/app/reports/chemical-inventory/page.tsx`
- `src/app/reports/overdue/page.tsx`
- `src/app/reports/trends/page.tsx`
- `src/app/reports/regulatory/page.tsx`
- `src/components/ui/progress.tsx`

---

## Additional Pages Copied Later

These were also copied from demo-prep to main:
- `src/app/customers/` - Customers list page
- `src/app/customer-products/` - Customer products page
- `src/app/settings/` - Settings page
- `src/app/tags/` - Tags management page

## What's Still on demo-prep Branch (Not Copied)

The following changes were made on demo-prep but NOT copied to main (they may have caused the sheets issue):
- Modifications to `src/app/sheets/[id]/page.tsx`
- Modifications to `src/components/sheets/question-input.tsx`
- Modifications to `src/components/sheets/list-table-input.tsx`
- `src/app/dpp/` - DPP readiness page (incomplete)

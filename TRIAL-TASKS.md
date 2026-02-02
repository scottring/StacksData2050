# Trial Demo Tasks - Monday Deadline

## Status: READY FOR DEMO

### Completed Tasks

- [x] **Demo Accounts Setup** - All 4 accounts working with password `demo2026`
  - kaisa.herranen@upm.com (UPM - Customer)
  - christian.torborg@sappi.com (Sappi - Customer)
  - tiia.aho@kemira.com (Kemira Oyj - Supplier)
  - abdessamad.arbaoui@omya.com (Omya - Supplier)

- [x] **CSV Export** - Chemical Inventory report now has working export button

- [x] **Invite Supplier** - New button on Suppliers page to invite new suppliers via email

- [x] **Contact Selection** - When creating requests, can now select specific person at supplier company

- [x] **Import Source Tracking** - Sheets now track whether they came from Excel import or request flow
  - `import_source: 'excel_import'` for imported sheets
  - `import_source: 'request'` for request-based sheets

- [x] **Dashboard Wired Up** - Dashboard now shows real data with clickable links
  - Stat cards link to filtered sheets views
  - Request Tracking section with outgoing/incoming request counts
  - Compliance Intelligence section with PFAS/REACH/Prop65 chemical counts
  - All sections link to relevant pages

- [x] **Legacy Sheets Fixed** - All 738 "draft" status sheets changed to "completed"

- [x] **DPP Tag Created** - EU Digital Product Passport tag and section added
  - New "DPP" tag for question filtering
  - New "EU Digital Product Passport" section
  - 8 DPP-specific questions (unique ID, carbon footprint, recycled content, etc.)

### Demo Flow Verified

1. **Login as UPM** (kaisa.herranen@upm.com / demo2026)
   - Customer view with 100+ suppliers
   - Key suppliers: Kemira Oyj (18 sheets), Omya (16 sheets), Solenis (42 sheets)

2. **Dashboard** (NEW)
   - Toggle between Customer/Supplier views
   - Clickable stat cards linking to filtered sheet lists
   - Request tracking with pending counts
   - Compliance Intelligence showing PFAS, REACH SVHC, Prop 65 chemicals

3. **Suppliers Page**
   - Shows all suppliers with relationship data
   - Task progress visualization
   - Invite Supplier button working

4. **Request Flow**
   - Create new request from Outgoing Requests page
   - **NEW**: Select specific contact at supplier company
   - Select tags (HQ 2.0.1, HQ2.1, DPP) for question filtering
   - Custom questions can be added
   - Email notifications via SendGrid

5. **Supplier View** (login as Kemira or Omya)
   - Incoming Requests page shows requests from customers
   - Sheet filling with CAS lookup
   - Real-time chemical validation

6. **Reports**
   - Chemical Inventory with CSV export
   - Executive dashboard

### Demo URLs

- `/login` - Start here
- `/dashboard` - Main dashboard with metrics (clickable sections)
- `/suppliers` - Supplier list (customer view)
- `/customers` - Customer list (supplier view)
- `/supplier-products` - Products requested from suppliers
- `/requests/outgoing` - Create new requests
- `/requests/incoming` - Supplier incoming requests
- `/sheets/[id]` - Fill/view sheet
- `/reports/chemical-inventory` - Chemical report with export
- `/compliance/supplier` - Chemical compliance dashboard

### Key Selling Points vs Bubble

| Pain Point | Stacks Solution |
|------------|-----------------|
| Slow UI | Fast Next.js + Supabase |
| No chemical validation | Real-time CAS lookup + regulatory flags |
| Data lock-in | CSV export, API access |
| Generic questionnaires | Custom questions per customer |
| Poor mobile | Responsive design |
| Limited reporting | Executive dashboards |
| No compliance tracking | REACH, PFAS, Prop 65 monitoring |
| No DPP support | EU Digital Product Passport ready |

### Files Modified (This Session)

- `web/src/app/dashboard/page.tsx` - Wired up with clickable sections, request tracking, compliance intelligence
- `web/src/app/api/import/execute/route.ts` - Added import_source tracking
- `web/src/components/sheets/request-sheet-dialog.tsx` - Added contact selection, import_source
- `web/src/lib/database.types.ts` - Updated types for import_source
- Database migration: `add_import_source_to_sheets` - New column for tracking sheet origin
- Database migration: `fix_legacy_draft_sheets_to_completed` - Fixed 738 draft sheets
- Database: Created DPP tag, section, subsection, and 8 questions

### To Run Demo Setup

```bash
cd stacks
npx tsx setup-demo-auth-users.ts
```

This sets all demo account passwords to `demo2026`.

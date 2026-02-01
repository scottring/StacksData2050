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

### Demo Flow Verified

1. **Login as UPM** (kaisa.herranen@upm.com / demo2026)
   - Customer view with 100+ suppliers
   - Key suppliers: Kemira Oyj (18 sheets), Omya (16 sheets), Solenis (42 sheets)

2. **Suppliers Page**
   - Shows all suppliers with relationship data
   - Task progress visualization
   - Invite Supplier button working

3. **Request Flow**
   - Create new request from Outgoing Requests page
   - Select tags (HQ 2.0.1, HQ2.1) for question filtering
   - Custom questions can be added
   - Email notifications via SendGrid

4. **Supplier View** (login as Kemira or Omya)
   - Incoming Requests page shows requests from customers
   - Sheet filling with CAS lookup
   - Real-time chemical validation

5. **Reports**
   - Chemical Inventory with CSV export
   - Executive dashboard

### Demo URLs

- `/login` - Start here
- `/dashboard` - Main dashboard with metrics
- `/suppliers` - Supplier list (customer view)
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

### Files Modified

- `web/src/app/reports/chemical-inventory/page.tsx` - Added CSV export
- `web/src/app/suppliers/page.tsx` - Added Invite Supplier button
- `web/src/components/suppliers/suppliers-header-actions.tsx` - New component
- `web/src/components/suppliers/invite-supplier-dialog.tsx` - New component
- `stacks/setup-demo-auth-users.ts` - Demo account setup script

### To Run Demo Setup

```bash
cd stacks
npx tsx setup-demo-auth-users.ts
```

This sets all demo account passwords to `demo2026`.

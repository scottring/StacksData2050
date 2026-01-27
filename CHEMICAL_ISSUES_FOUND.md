# Chemical Compliance Dashboard Issues

## Summary

Two main issues found on `/compliance/supplier` page:

1. **Sheet counts show "1" for all chemicals** (should show actual counts like 8, 140, 65, etc.)
2. **All regulatory flags are zero** (PFAS, REACH, Prop 65, High Risk all show 0)

---

## Issue 1: Incorrect Sheet Count Display

### Current Behavior
- Every chemical shows "1 sheet" in the table
- Summary card shows incorrect total

### Root Cause
The Supabase query returns: `sheet_chemicals: [{ count: 147 }]`

But the page code does:
```typescript
const sheetCount = Array.isArray(chemical.sheet_chemicals)
  ? chemical.sheet_chemicals.length  // ❌ This is always 1
  : 0
```

### Actual Data
```
(Ethylenedioxy)dimethanol: 8 sheets
1,2-Benzisothiazol-3(2H)-one: 140 sheets
2,2-DIBROMO-2-CYANOACETAMIDE: 65 sheets
Kathon 886: 329 sheets (!)
bronopol: 249 sheets
```

### Fix Options

**Option A: Fix the parsing logic**
```typescript
const sheetCount = Array.isArray(chemical.sheet_chemicals)
  ? (chemical.sheet_chemicals[0]?.count || 0)
  : 0
```

**Option B: Change the query (better approach)**
```typescript
const { data: chemicals } = await supabase
  .from('chemical_inventory')
  .select(`
    *,
    sheet_chemicals!inner(sheet_id)
  `)
  .order('chemical_name')

// Then count unique sheets in code:
chemicals?.map(chem => ({
  ...chem,
  sheet_count: new Set(chem.sheet_chemicals.map(sc => sc.sheet_id)).size
}))
```

**Option C: Use a database view (most efficient)**
Create a view that pre-calculates counts:
```sql
CREATE VIEW chemical_inventory_with_counts AS
SELECT
  ci.*,
  COUNT(DISTINCT sc.sheet_id) as sheet_count
FROM chemical_inventory ci
LEFT JOIN sheet_chemicals sc ON sc.chemical_id = ci.id
GROUP BY ci.id;
```

---

## Issue 2: All Regulatory Flags are Zero

### Current State
```
Total Chemicals: 20
PFAS: 0
REACH SVHC: 0
Prop 65: 0
High Risk: 0
```

All chemicals have:
- `is_pfas = false`
- `is_reach_svhc = false`
- `is_prop65 = false`
- `risk_level = 'low'`

### Expected Behavior
Some chemicals SHOULD be flagged:

**Formaldehyde (50-00-0)**
- ✅ REACH SVHC: Yes (listed)
- ✅ Prop 65: Yes (carcinogen)
- ✅ Risk Level: HIGH

**Glutaraldehyde (111-30-8)**
- ✅ REACH SVHC: Yes (respiratory sensitizer)
- ✅ Risk Level: HIGH

**Bronopol (52-51-7)**
- ✅ Risk Level: MEDIUM
- ⚠️ Formaldehyde releaser

### Root Cause
One of:
1. Chemical enrichment script never ran
2. Script ran but PubChem API doesn't return regulatory data
3. Regulatory list matching logic is missing/broken
4. Only basic PubChem data was fetched (name, formula) without regulatory checks

### What's Needed
A regulatory enrichment process that:

1. **Checks REACH SVHC List** (EU)
   - Official list: https://echa.europa.eu/candidate-list-table
   - ~240 substances
   - Match by CAS number

2. **Checks Prop 65 List** (California)
   - Official list: https://oehha.ca.gov/proposition-65/proposition-65-list
   - ~900 chemicals
   - Match by CAS number or chemical name

3. **Checks PFAS Databases**
   - EPA CompTox: https://comptox.epa.gov/dashboard
   - OECD PFAS list
   - Heuristic: Contains C-F bonds (fluorinated organics)

4. **Risk Level Assessment**
   - HIGH: REACH SVHC OR Prop 65 OR known carcinogen
   - MEDIUM: Skin/respiratory sensitizer OR formaldehyde releaser
   - LOW: None of the above

### Current Demo Page Data
The `/demo/compliance` page shows MOCK data with:
- PFAS warnings
- REACH SVHC badges
- Migration testing flags

This is **hardcoded demo data**, not real database enrichment.

---

## Priority

### High Priority (For Demo)
Fix Issue 1 (sheet counts) - makes the dashboard look broken

### Medium Priority (For Production)
Fix Issue 2 (regulatory enrichment) - this is a core value proposition

---

## Next Steps

1. **Quick Fix:** Update the sheet count parsing (5 minutes)
2. **Demo Fix:** Add regulatory data for the 20 existing chemicals (manual or script)
3. **Production Fix:** Build regulatory enrichment pipeline with official lists

---

## Files Affected

### To Fix Sheet Counts
- `/stacks/web/src/app/compliance/supplier/page.tsx:148-150`

### To Fix Regulatory Flags (need to create)
- `/stacks/src/enrich-chemicals-regulatory.ts` (new script)
- Update PubChem integration to check regulatory databases
- Or: import official REACH/Prop65/PFAS lists as lookup tables

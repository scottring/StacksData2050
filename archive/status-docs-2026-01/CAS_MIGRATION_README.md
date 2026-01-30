# CAS Number Migration to Chemical Inventory

## Overview

This migration converts CAS (Chemical Abstracts Service) numbers from plain text fields into a normalized chemical inventory database with regulatory enrichment from PubChem.

## Status: Ready to Execute

### Phase 1: Database Schema ✅ CREATED
- [migrations/create-chemical-inventory-tables.sql](migrations/create-chemical-inventory-tables.sql)
- Tables: `chemical_inventory`, `sheet_chemicals`
- Indexes for performance
- RLS policies configured

### Phase 2: Migration Script ✅ CREATED
- [migrate-cas-numbers-to-inventory.ts](migrate-cas-numbers-to-inventory.ts)
- Extracts CAS numbers from biocides section (Question 3.1.2)
- Enriches via PubChem API
- Checks regulatory status (PFAS, REACH, Prop 65, EPA TOSCA, RoHS)
- Links chemicals to sheets with concentration data

## Execution Steps

### Step 1: Create Database Tables

**Option A: Via Supabase Dashboard** (Recommended)

1. Go to Supabase Dashboard > SQL Editor
2. Create new query
3. Copy/paste SQL from [migrations/create-chemical-inventory-tables.sql](migrations/create-chemical-inventory-tables.sql)
4. Click "Run"

**Option B: Verify with Script**

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks
npx tsx create-chemical-tables.ts
```

This will check if tables exist and print the SQL if they don't.

### Step 2: Run CAS Migration

```bash
cd /Users/scottkaufman/Developer/StacksData2050/stacks
npx tsx migrate-cas-numbers-to-inventory.ts
```

**Expected Timeline:**
- Extracts ~X unique CAS numbers from answers
- Enriches via PubChem API (4 requests/second max)
- Estimated time: ~(unique_cas_count * 0.25s) = ~X minutes
- Creates sheet-chemical links

**What It Does:**
1. Queries all CAS numbers from biocides list table
2. Deduplicates to unique CAS numbers
3. For each CAS:
   - Looks up chemical data in PubChem
   - Checks regulatory databases (PFAS, REACH, Prop 65, etc.)
   - Inserts into `chemical_inventory` with flags
4. Links chemicals to sheets in `sheet_chemicals` with:
   - Concentration values
   - Units (% w/w, ppm, etc.)
   - Original answer references

## Database Schema

### chemical_inventory

Stores unique chemicals with enriched data:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `cas_number` | TEXT | CAS registry number (unique) |
| `pubchem_cid` | INTEGER | PubChem Compound ID |
| `chemical_name` | TEXT | Common/IUPAC name |
| `molecular_formula` | TEXT | e.g., "CH2O" |
| `molecular_weight` | NUMERIC | g/mol |
| `synonyms` | TEXT[] | Array of alternative names |
| `is_pfas` | BOOLEAN | Per- and polyfluoroalkyl substances |
| `is_reach_svhc` | BOOLEAN | EU REACH SVHC |
| `is_prop65` | BOOLEAN | California Prop 65 |
| `is_epa_tosca` | BOOLEAN | US EPA TOSCA |
| `is_rohs` | BOOLEAN | EU RoHS restricted |
| `risk_level` | TEXT | 'high', 'medium', or 'low' |
| `warnings` | TEXT[] | Regulatory warnings |
| `hazards` | TEXT[] | GHS hazard statements |

**Indexes:**
- `cas_number` (unique, fast lookup)
- `is_pfas` (filtered for PFAS queries)
- `is_reach_svhc` (filtered for REACH queries)
- `is_prop65` (filtered for Prop 65 queries)

### sheet_chemicals

Links chemicals to supplier sheets:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `sheet_id` | UUID | References `sheets(id)` |
| `chemical_id` | UUID | References `chemical_inventory(id)` |
| `concentration` | NUMERIC | Amount disclosed |
| `concentration_unit` | TEXT | % w/w, ppm, mg/kg, etc. |
| `list_table_row_id` | UUID | Original row reference |
| `answer_id` | UUID | Original answer reference |

**Indexes:**
- `sheet_id` (find all chemicals in a sheet)
- `chemical_id` (find all sheets using a chemical)

**Unique Constraint:**
- `(sheet_id, chemical_id, list_table_row_id)` prevents duplicates

## Migration Constants

From biocides section exploration:

```typescript
const BIOCIDES_QUESTION_ID = '55eeea30-92d0-492e-aa44-37819705fbb0'  // Question 3.1.2
const CAS_COLUMN_ID = '5e22b0e9-0a67-49ab-9734-b1ec6cf5e14b'          // "CAS No." column
const CONCENTRATION_COLUMN_ID = '7481500b-5aa2-4731-929f-8483ef6e5434' // Concentration
const UNIT_COLUMN_ID = 'c609f59f-1676-4e1d-b506-9531aa9b6167'         // Unit column
```

## Regulatory Checks

The migration checks each chemical against:

### PFAS Detection
- Fluorine-containing compounds
- Known PFAS substances list
- EU restriction pending 2026

### REACH SVHC
- Substance of Very High Concern
- Candidate list substances
- Authorization requirements

### California Prop 65
- Known carcinogens
- Reproductive toxins
- Required warnings

### EPA TOSCA
- US Toxic Substances Control Act
- Inventory status

### RoHS
- EU Restriction of Hazardous Substances
- Lead, mercury, cadmium, etc.

## Data Quality

After migration, verify with:

```typescript
// Check total chemicals
const { count } = await supabase
  .from('chemical_inventory')
  .select('*', { count: 'exact', head: true })

// Check PFAS count
const { count: pfasCount } = await supabase
  .from('chemical_inventory')
  .select('*', { count: 'exact', head: true })
  .eq('is_pfas', true)

// Get sheets with chemicals
const { data: sheetsWithChemicals } = await supabase
  .from('sheet_chemicals')
  .select('sheet_id, sheets(name), chemical_inventory(chemical_name, is_pfas)')
```

## Sample Queries for Compliance Dashboards

### Supplier Dashboard: Find all PFAS chemicals

```sql
SELECT
  ci.cas_number,
  ci.chemical_name,
  ci.molecular_formula,
  COUNT(DISTINCT sc.sheet_id) as sheet_count
FROM chemical_inventory ci
JOIN sheet_chemicals sc ON ci.id = sc.chemical_id
WHERE ci.is_pfas = true
GROUP BY ci.id
ORDER BY sheet_count DESC;
```

### Manufacturer Dashboard: Aggregate supplier compliance

```sql
SELECT
  c.name as supplier_name,
  COUNT(DISTINCT s.id) as total_sheets,
  COUNT(DISTINCT sc.chemical_id) as unique_chemicals,
  COUNT(DISTINCT CASE WHEN ci.is_pfas THEN ci.id END) as pfas_count,
  COUNT(DISTINCT CASE WHEN ci.is_reach_svhc THEN ci.id END) as reach_count
FROM companies c
JOIN sheets s ON s.company_id = c.id
LEFT JOIN sheet_chemicals sc ON sc.sheet_id = s.id
LEFT JOIN chemical_inventory ci ON ci.id = sc.chemical_id
GROUP BY c.id
ORDER BY pfas_count DESC;
```

### Find high-risk chemicals by sheet

```sql
SELECT
  s.name as sheet_name,
  ci.chemical_name,
  ci.cas_number,
  sc.concentration,
  sc.concentration_unit,
  ci.risk_level,
  ci.warnings
FROM sheets s
JOIN sheet_chemicals sc ON sc.sheet_id = s.id
JOIN chemical_inventory ci ON ci.id = sc.chemical_id
WHERE ci.risk_level = 'high'
ORDER BY s.name, ci.chemical_name;
```

## Next Steps After Migration

1. **Verify Migration Success**
   - Check counts match expected values
   - Spot-check a few chemicals manually
   - Verify regulatory flags look correct

2. **Build Compliance Dashboards**
   - Supplier dashboard (`/compliance/supplier`)
   - Manufacturer dashboard (`/compliance/manufacturer`)
   - Use queries above as foundation

3. **Add UI Components**
   - CAS Registry Table
   - Regulatory Flags (badges for PFAS, REACH, etc.)
   - Compliance Score Cards
   - Chemical Heatmap (suppliers × chemicals)

4. **Testing**
   - Test with Hydrocarb sheet (known to have biocides)
   - Test with sheets lacking CAS numbers (graceful handling)
   - Test filtering by regulatory flags

## Rollback Plan

If migration needs to be reverted:

```sql
-- Delete all data (keeps structure)
TRUNCATE sheet_chemicals CASCADE;
TRUNCATE chemical_inventory CASCADE;

-- Or drop tables entirely
DROP TABLE IF EXISTS sheet_chemicals CASCADE;
DROP TABLE IF EXISTS chemical_inventory CASCADE;
```

Original CAS data remains intact in `answers` table - no data loss.

## Files Created

- ✅ [migrations/create-chemical-inventory-tables.sql](migrations/create-chemical-inventory-tables.sql) - Database schema
- ✅ [create-chemical-tables.ts](create-chemical-tables.ts) - Verification script
- ✅ [migrate-cas-numbers-to-inventory.ts](migrate-cas-numbers-to-inventory.ts) - Main migration
- ✅ [CAS_MIGRATION_README.md](CAS_MIGRATION_README.md) - This document

## Ready to Execute!

The migration infrastructure is complete and ready to run. Execute Step 1 (create tables) then Step 2 (run migration).

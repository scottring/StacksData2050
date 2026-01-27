# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stacks Data 2050 is a supplier compliance intelligence platform for the paper/packaging industry that was migrated from Bubble.io to Supabase. The system manages supplier product questionnaires (221 questions per sheet) with hierarchical question structures, tags for versioning (e.g., HQ 2.0.1 vs HQ2.1), chemical compliance tracking, and supply chain intelligence.

The project consists of:
- A Next.js 15 web application (`/web`) with Supabase backend
- Migration scripts and tooling for the Bubble.io → Supabase data migration  
- Chemical compliance intelligence system with regulatory tracking (REACH SVHC, Prop 65, PFAS)

## Development Commands

### Web Application (Next.js)

```bash
# Navigate to web directory
cd web

# Development server (runs on port 3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Migration & Utility Scripts

Run from `/stacks` directory:

```bash
# Full migration
npm run migrate

# Dry run mode
npm run migrate:dry-run

# Run any TypeScript utility script
npx tsx <script-name>.ts

# Examples:
npx tsx enrich-chemicals-regulatory.ts
npx tsx check-chemical-data.ts
npx tsx verify-dashboard-data.ts
```

## Architecture

### Web Application Structure

**Technology Stack:**
- **Framework**: Next.js 15.1.1 with App Router (Server Components by default)
- **UI**: React 19 with shadcn/ui (Radix UI primitives) and Tailwind CSS v4
- **Database**: Supabase (PostgreSQL) with SSR support
- **Auth**: Supabase Auth with middleware protection
- **Icons**: Lucide React

**Key directories:**
- `/web/src/app/` - Next.js app router pages (all server components unless marked "use client")
  - `sheets/[id]/` - Sheet detail and editing
  - `dashboard/` - Main dashboard
  - `compliance/` - Chemical compliance intelligence
    - `supplier/` - Main compliance dashboard
    - `chemical/[id]/` - Chemical detail with products
  - `suppliers/` - Supplier management
  - `questions/` - Question management
  - `admin/` - Admin interface
  - `auth/` - Authentication pages
  - `demo/compliance/` - Standalone CAS lookup demo
- `/web/src/components/` - Reusable React components
  - `layout/` - App layout, sidebar, header (must be client components)
  - `sheets/` - Sheet-specific components (question inputs, list tables, CAS lookup)
  - `dashboard/` - Dashboard components
  - `ui/` - shadcn/ui base components
- `/web/src/lib/` - Utility functions and clients
  - `supabase/` - Supabase client configuration (server.ts vs client.ts)
  - `pubchem.ts` - PubChem API integration for chemical data

**Layout Pattern:**
All main pages use `<AppLayout>` wrapper for consistent navigation:
```typescript
import { AppLayout } from '@/components/layout/app-layout'

export default async function MyPage() {
  return (
    <AppLayout title="Page Title">
      <div className="space-y-8">
        {/* Page content */}
      </div>
    </AppLayout>
  )
}
```

### Chemical Compliance Intelligence System

**New Feature (Jan 2026)**: Supply chain chemical tracking across all supplier sheets.

**Architecture:**
- `chemical_inventory` table stores unique chemicals enriched with PubChem data
- `sheet_chemicals` junction table links chemicals to sheets
- Automatic regulatory flagging (REACH SVHC, Prop 65, PFAS)
- CAS number validation and auto-fill via PubChem API

**Key Files:**
- `/web/src/app/compliance/supplier/page.tsx` - Main compliance dashboard (server component)
- `/web/src/app/compliance/chemical/[id]/page.tsx` - Chemical detail page (server component)
- `/web/src/components/sheets/cas-lookup.tsx` - CAS number lookup component (client component)
- `/web/src/lib/pubchem.ts` - PubChem API integration
- `/stacks/enrich-chemicals-regulatory.ts` - Regulatory enrichment script

**Important Implementation Details:**

1. **Product Deduplication**: Chemical detail pages deduplicate by product name and show only the most recent version:
```typescript
// Keep most recent version per product name
const sheetsByName = new Map()
sheetChemicals?.forEach((sc: any) => {
  const productName = sc.sheets.name
  const existing = sheetsByName.get(productName)
  if (!existing || new Date(sc.sheets.created_at) > new Date(existing.created_at)) {
    sheetsByName.set(productName, sc.sheets)
  }
})
```

2. **Sheet Count Calculation**: Must parse aggregated count from Supabase query:
```typescript
const sheetCount = Array.isArray(chemical.sheet_chemicals) && chemical.sheet_chemicals.length > 0
  ? (chemical.sheet_chemicals[0] as any).count || 0
  : 0
```

3. **Foreign Key Ambiguity**: When joining `sheets` → `companies`, must specify which FK:
```typescript
companies!sheets_company_id_fkey (name)
```

4. **Next.js 15 Async Params**: Dynamic route params are now Promises:
```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Must await!
}
```

**Chemical Enrichment:**
- Run `/stacks/enrich-chemicals-regulatory.ts` to flag chemicals
- Uses official REACH SVHC, Prop 65, and PFAS lists
- Automatically calculates risk levels (high/medium/low)
- Identifies formaldehyde releasers (biocides that decompose to formaldehyde)

### List Table Architecture

**Critical concept**: List tables are dynamic tables within sheets where users can add/remove rows and fill in multiple columns.

**Data Model:**
- `list_table_columns` - Defines columns (name, order, response_type, choice_options)
- `answers` - Stores cell data with `list_table_row_id` and `list_table_column_id`
- Rows are identified by unique `list_table_row_id` values

**Key implementation details:**
1. **Column Discovery**: Columns are discovered from actual answer data, not from question.list_table_id (which may be null)
2. **Deduplication**: Use global latest `created_at` timestamp across all rows for a question to filter the most recent version
3. **Dropdown Support**: Columns can have `choice_options` (jsonb array) for dropdown inputs
4. **Choice Lookup**: Dropdown values use `answer.choice_id` → `choices.content` (not `choices.text`)

**Files:**
- `web/src/app/sheets/[id]/page.tsx` - Server component that loads and processes sheet data, handles list table deduplication
- `web/src/components/sheets/list-table-input.tsx` - Client component for rendering list tables
- `web/src/components/sheets/question-input.tsx` - Handles all question input types including list tables

### Migration Architecture

**Technology Stack:**
- TypeScript with Node.js
- Direct Supabase API calls
- Custom ID mapping system

**Key Design Patterns:**

1. **ID Mapping**: Bubble string IDs → Supabase UUIDs
   - Uses `_migration_id_map` table
   - In-memory cache for performance
   - See `src/migration/id-mapper.ts`

2. **Two-Phase Import for Answers**:
   - Phase 1: Migrate all entity types (associations, companies, users, questions, etc.)
   - Phase 2: Import 367k answers from JSON export (too large for API)
   - Post-import fix for choice_id relationships

3. **Retry Logic**: 3 attempts with 2-second delay for transient network errors

**Migration Order** (respects foreign key dependencies):
1. Associations → Stacks → Companies → Users
2. List Tables → List Table Columns
3. Sections → Subsections
4. Tags → Questions → Choices
5. Sheets → Answers → Requests → Sheet Statuses

**Migration Files:**
- `src/migration/index.ts` - Main orchestrator (16 steps)
- `src/migration/migrators/` - Individual entity migrators
- `src/migration/import-answers-json.ts` - Large-scale JSON import
- `src/migration/id-mapper.ts` - ID translation system

## Database Schema

### Core Tables

**sheets** - Questionnaire instances
- Core fields: `name`, `version`, `company_id`, `created_by`
- Status field: `new_status` (draft/submitted/approved)
- Versioning: `version_lock`, `version_close_date`, `father_sheet_id`

**answers** - Question responses (367k records)
- Multiple value types: `text_value`, `number_value`, `choice_id`, `boolean_value`, `date_value`
- List table integration: `list_table_row_id`, `list_table_column_id`
- Relationships: `sheet_id`, `parent_question_id`, `choice_id`, `company_id`

**questions** - Compliance questions (221 total)
- Fields: `text`, `response_type`, `section_id`, `subsection_id`
- Hierarchical numbering: `section_sort_number.subsection_sort_number.order_number`
- `list_table_id` may be null even when columns exist

**list_table_columns** - Dynamic column definitions
- Fields: `name`, `order_number`, `response_type`, `parent_table_id`
- **`choice_options`** (jsonb): Array of dropdown choices `["mg/kg", "percent"]`

**choices** - Multiple choice options
- Fields: `id`, **`content`** (not "text"), `parent_question_id`, `order_number`

### Chemical Compliance Tables

**chemical_inventory** - Unique chemicals with enriched data
- Core: `cas_number` (unique), `chemical_name`, `molecular_formula`, `molecular_weight`
- PubChem data: `pubchem_cid`, `synonyms`, `iupac_name`, `inchi_key`
- Regulatory flags: `is_pfas`, `is_reach_svhc`, `is_prop65`, `is_food_contact_restricted`
- Risk assessment: `risk_level` (high/medium/low), `warnings`, `restrictions`, `hazards`

**sheet_chemicals** - Junction table linking chemicals to sheets
- Links: `sheet_id`, `chemical_id`
- Concentration data: `concentration`, `concentration_unit`
- Traceability: `list_table_row_id`, `answer_id`
- Unique per: (sheet_id, chemical_id, list_table_row_id)

**Migration ID Mapping:**
- `_migration_id_map` - Bubble ID → Supabase UUID mappings for traceability

## Environment Variables

### Web Application (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yrguoooxamecsjtkfqcw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

### Migration Scripts (.env in /stacks root)

```bash
# Supabase
SUPABASE_URL=https://yrguoooxamecsjtkfqcw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Bubble.io (for migration only)
BUBBLE_API_URL=https://app.stacksdata.com/version-live
BUBBLE_API_TOKEN=<api_token>

# Options
DRY_RUN=false
BATCH_SIZE=100
```

## Recent Bug Fixes & Patterns

### Next.js 15 Async Params (Fixed Jan 2026)

**Issue**: Dynamic route params are now Promises in Next.js 15.

**Pattern:**
```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>  // Type as Promise
}) {
  const { id } = await params  // Must await params
  // ... use id
}
```

### Chemical Product Deduplication (Fixed Jan 2026)

**Issue**: Same product appeared multiple times due to version history.

**Solution**: Deduplicate by product name, keep only most recent:
```typescript
const sheetsByName = new Map()
sheetChemicals?.forEach((sc: any) => {
  const productName = sc.sheets.name
  const existing = sheetsByName.get(productName)
  if (!existing || new Date(sc.sheets.created_at) > new Date(existing.created_at)) {
    sheetsByName.set(productName, sc.sheets)
  }
})
```

### List Table Dropdown Values (Fixed Jan 2026)

**Issue**: Units dropdown showing empty values instead of selected choices.

**Root Cause**: Code used `choice.text` but database field is `choice.content`.

**Fix**: Always use `choice.content` for choice lookups.

### List Table Deduplication

**Issue**: Multiple duplicate rows showing due to version history.

**Solution**: Find GLOBAL latest `created_at` across ALL rows for a list table question, then only keep rows matching that timestamp. See `web/src/app/sheets/[id]/page.tsx:228-289`.

### Supabase Foreign Key Ambiguity

**Issue**: Error when joining sheets → companies due to multiple foreign keys.

**Solution**: Specify exact foreign key relationship:
```typescript
companies!sheets_company_id_fkey (name)
```

## Demo & Testing

### Demo Accounts (Password: `demo2026`)

| Company | User | Email |
|---------|------|-------|
| UPM (Customer) | Kaisa Herranen | kaisa.herranen@upm.com |
| Sappi (Customer) | Christian Torborg | christian.torborg@sappi.com |
| Kemira (Supplier) | Tiia Aho | tiia.aho@kemira.com |
| Omya (Supplier) | Abdessamad Arbaoui | abdessamad.arbaoui@omya.com |

### Key Demo URLs

- `/` - Dashboard (requires login)
- `/sheets/[id]` - Sheet editing with CAS validation
- `/compliance/supplier` - Chemical compliance intelligence dashboard
- `/compliance/chemical/[id]` - Chemical detail with affected products
- `/demo/compliance` - Standalone CAS lookup demo (no login required)

### Testing Scripts

```bash
cd /stacks

# Test compliance dashboard data
npx tsx test-compliance-dashboard.ts

# Verify chemical enrichment
npx tsx check-flagged-chemicals.ts

# Verify dashboard queries
npx tsx verify-dashboard-data.ts
```

## Migration Status

**Completed (Dec 27-28, 2025):**
- ✅ 410,274 records migrated
- ✅ Data integrity verified
- ✅ Foreign key relationships validated
- ✅ Choice ID mappings fixed (99,203 updates)
- ✅ Chemical compliance system added (Jan 2026)

**Remaining:**
- ⏳ Enable Row Level Security policies
- ⏳ Configure Supabase Auth for production
- ⏳ Send password reset emails to users

## MCP Server Configuration

This project uses MCP (Model Context Protocol) servers for integration:

**Supabase MCP** - Database operations
- Configured in `.mcp.json`
- URL: `https://mcp.supabase.com/mcp?project_ref=yrguoooxamecsjtkfqcw`

**Bubble MCP** - Legacy Bubble.io access (if needed)
- Command: `node /Users/scottkaufman/Developer/StacksData2050/bubble_mcp/dist/mcp-server.js`
- Uses environment variables for API access

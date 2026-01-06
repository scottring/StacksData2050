# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stacks Data 2050 is a supply chain compliance platform that was migrated from Bubble.io to Supabase. The project consists of:
- A Next.js 16 web application (`/web`) with Supabase backend
- Migration scripts and tooling for the Bubble.io → Supabase data migration

## Development Commands

### Web Application (Next.js)

```bash
# Navigate to web directory
cd web

# Development server (runs on port 3000, or 3002 if 3000 is in use)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Migration Scripts

```bash
# Full migration (root directory)
npm run migrate

# Dry run mode
npm run migrate:dry-run

# Import answers from JSON
npx tsx src/migration/import-answers-json.ts

# Fix choice relationships
npx tsx src/migration/fix-answer-choices-batch.ts

# Verify migration
npx tsx src/migration/verify-migration.ts
```

## Architecture

### Web Application Structure

The Next.js application uses:
- **Framework**: Next.js 16.1.1 with App Router and Turbopack
- **UI**: React 19 with Radix UI components and Tailwind CSS
- **Database**: Supabase (PostgreSQL) with SSR support
- **Icons**: Lucide React

**Key directories:**
- `/web/src/app/` - Next.js app router pages
  - `sheets/[id]/` - Sheet detail and editing
  - `dashboard/` - Main dashboard
  - `suppliers/` - Supplier management
  - `questions/` - Question management
  - `admin/` - Admin interface
  - `auth/` - Authentication pages
- `/web/src/components/` - Reusable React components
  - `sheets/` - Sheet-specific components (question inputs, list tables)
  - `ui/` - Base UI components (buttons, inputs, etc.)
- `/web/src/lib/` - Utility functions and clients
  - `supabase/` - Supabase client configuration

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

**Migration Files:**
- `src/migration/index.ts` - Main orchestrator (16 steps)
- `src/migration/migrators/` - Individual entity migrators
- `src/migration/import-answers-json.ts` - Large-scale JSON import
- `src/migration/id-mapper.ts` - ID translation system

## Database Schema

### Key Tables

**sheets** - Questionnaire instances
- Core fields: name, version, company_id, created_by
- Versioning: version_lock, version_close_date, father_sheet_id
- Status tracking: new_name, unread_comment, mark_as_archived

**answers** - Question responses (367k records)
- Multiple value types: text_value, number_value, choice_id, boolean_value, date_value
- List table integration: list_table_row_id, list_table_column_id
- Relationships: sheet_id, parent_question_id, choice_id, company_id

**list_table_columns** - Dynamic column definitions
- Fields: name, order_number, response_type, parent_table_id
- **choice_options** (jsonb): Array of dropdown choices ["mg/kg", "percent"]

**choices** - Multiple choice options
- Fields: id, **content** (not "text"), parent_question_id, order_number

**questions** - Compliance questions
- Fields: text, response_type, section_id, subsection_id
- list_table_id may be null even when columns exist

## Environment Variables

### Web Application (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yrguoooxamecsjtkfqcw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### Migration Scripts (.env)

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

## Recent Bug Fixes

### List Table Dropdown Values (Fixed Jan 2026)

**Issue**: Units dropdown showing empty values instead of selected choices.

**Root Cause**: Code used `choice.text` but database field is `choice.content`.

**Fix**: Changed choice lookup to use `choice.content` in `web/src/app/sheets/[id]/page.tsx:476`.

### List Table Deduplication

**Issue**: Multiple duplicate rows showing due to version history.

**Solution**: Find GLOBAL latest `created_at` across ALL rows for a list table question, then only keep rows matching that timestamp. See `web/src/app/sheets/[id]/page.tsx:228-289`.

## Migration Status

**Completed (Dec 27-28, 2025):**
- ✅ 410,274 records migrated
- ✅ Data integrity verified
- ✅ Foreign key relationships validated
- ✅ Choice ID mappings fixed (99,203 updates)

**Remaining:**
- ⏳ Enable Row Level Security policies
- ⏳ Configure Supabase Auth
- ⏳ Send password reset emails to users

## MCP Server Configuration

This project uses MCP (Model Context Protocol) servers for integration:

**Supabase MCP** - Database operations
- Configured in `.mcp.json`
- URL: `https://mcp.supabase.com/mcp?project_ref=yrguoooxamecsjtkfqcw`

**Bubble MCP** - Legacy Bubble.io access (if needed)
- Command: `node /Users/scottkaufman/Developer/StacksData2050/bubble_mcp/dist/mcp-server.js`
- Uses environment variables for API access

/**
 * Seed canonical parameters from the HQ 2.1 workbook into Supabase.
 *
 * Usage: cd stacks/web && npx tsx scripts/seed-canonical-parameters.ts
 *
 * Reads: .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Source: ~/Documents/scotts-world/reference/hq2.1 blank questionnaire.xlsx
 *
 * Idempotent: uses upsert on unique keys. Safe to re-run.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WORKBOOK_PATH = path.resolve(
  process.env.HOME || '~',
  'Documents/scotts-world/reference/hq2.1 blank questionnaire.xlsx'
);

// ─── Detail table schemas ────────────────────────────────────────────────────

const DETAIL_SCHEMAS = {
  biocide: [
    { key: 'chemical_name', label: 'Chemical Name' },
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'ec_number', label: 'EC Number' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
  food_contact_eu: [
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'fcm_number', label: 'FCM Number of Regulation' },
    { key: 'sml_mg_kg', label: 'SML (mg/kg)' },
    { key: 'chemical_name', label: 'Chemical Name' },
    { key: 'restrictions', label: 'Restrictions and Specifications' },
    { key: 'comments', label: 'Comments' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
  food_contact_plastics: [
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'fcm_number', label: 'FCM Number in (EU) 10/2011' },
    { key: 'sml_mg_kg', label: 'SML (mg/kg)' },
    { key: 'e_number', label: 'E-No.' },
    { key: 'chemical_name', label: 'Chemical Name' },
    { key: 'restrictions', label: 'Restrictions and Specifications' },
    { key: 'comments', label: 'Comments' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
  food_contact_us: [
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'chemical_name', label: 'Substance or Product (Chemical) Name' },
    { key: 'food_type_restrictions', label: 'Restrictions on food types and/or conditions of use' },
    { key: 'restrictions', label: 'Restrictions and Specifications' },
    { key: 'comments', label: 'Comments' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
  food_contact_china: [
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'fca_number', label: 'FCA Number' },
    { key: 'sml_mg_kg', label: 'SML (mg/kg)' },
    { key: 'chemical_name', label: 'Chemical Name' },
    { key: 'restrictions', label: 'Restrictions and Specifications' },
    { key: 'comments', label: 'Comments' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
  pidsl: [
    { key: 'chemical_name', label: 'Chemical name' },
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'ec_number', label: 'EC Number' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
  substance_basic: [
    { key: 'substance_name', label: 'Substance/Chemical Name' },
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'ec_number', label: 'EC Number' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
  allergen: [
    { key: 'allergen_name', label: 'Allergen or Chemical Name' },
    { key: 'cas_number', label: 'CAS Number' },
    { key: 'ec_number', label: 'EC Number' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'unit', label: 'Unit (% or ppm)' },
  ],
} as const;

type DetailSchemaKey = keyof typeof DETAIL_SCHEMAS;

// ─── Parameter definitions ───────────────────────────────────────────────────
// Each entry maps to one canonical parameter.
// Row numbers are 1-indexed (matching Excel).
// Question text is read from column B at the given row.

interface ParamDef {
  code: string;
  section: string;
  subsection: string;
  row: number; // 1-indexed row in workbook where question text is in col B
  tab: string; // workbook tab name
  answerType: string;
  jurisdiction: string;
  pattern: 'simple' | 'with_detail_table';
  detailSchema?: DetailSchemaKey;
}

const PARAMS: ParamDef[] = [
  // ── Section 2: Ecolabels ──────────────────────────────────────────────────
  // 2.1 EU Ecolabel (answer type: EUEco from data validations)
  { code: '2.1.1', section: 'Ecolabels', subsection: 'EU Ecolabel', row: 6, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'EU', pattern: 'simple' },
  { code: '2.1.2', section: 'Ecolabels', subsection: 'EU Ecolabel', row: 9, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'EU', pattern: 'simple' },
  { code: '2.1.3', section: 'Ecolabels', subsection: 'EU Ecolabel', row: 12, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'EU', pattern: 'simple' },
  { code: '2.1.4', section: 'Ecolabels', subsection: 'EU Ecolabel', row: 15, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'EU', pattern: 'simple' },

  // 2.2 Nordic Ecolabel (YPPNNP for Nordic/MySwan, EUEco for the last two)
  { code: '2.2.1', section: 'Ecolabels', subsection: 'Nordic Ecolabel', row: 21, tab: 'Ecolabels', answerType: 'YPPNNP', jurisdiction: 'EU', pattern: 'simple' },
  { code: '2.2.2', section: 'Ecolabels', subsection: 'Nordic Ecolabel', row: 24, tab: 'Ecolabels', answerType: 'YPPNNP', jurisdiction: 'EU', pattern: 'simple' },
  { code: '2.2.3', section: 'Ecolabels', subsection: 'Nordic Ecolabel', row: 27, tab: 'Ecolabels', answerType: 'YPPNNP', jurisdiction: 'EU', pattern: 'simple' },
  { code: '2.2.4', section: 'Ecolabels', subsection: 'Nordic Ecolabel', row: 30, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'EU', pattern: 'simple' },
  { code: '2.2.5', section: 'Ecolabels', subsection: 'Nordic Ecolabel', row: 33, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'EU', pattern: 'simple' },

  // 2.3 Blue Angel (EUEco)
  { code: '2.3.1', section: 'Ecolabels', subsection: 'Blue Angel', row: 39, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'DE', pattern: 'simple' },
  { code: '2.3.2', section: 'Ecolabels', subsection: 'Blue Angel', row: 42, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'DE', pattern: 'simple' },
  { code: '2.3.3', section: 'Ecolabels', subsection: 'Blue Angel', row: 45, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'DE', pattern: 'simple' },
  { code: '2.3.4', section: 'Ecolabels', subsection: 'Blue Angel', row: 48, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'DE', pattern: 'simple' },
  { code: '2.3.5', section: 'Ecolabels', subsection: 'Blue Angel', row: 51, tab: 'Ecolabels', answerType: 'EUEco', jurisdiction: 'DE', pattern: 'simple' },

  // ── Section 3: Biocides (all YNNA, single subsection) ─────────────────────
  { code: '3.1.1',  section: 'Biocides', subsection: 'General', row: 4,  tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'biocide' },
  { code: '3.1.2',  section: 'Biocides', subsection: 'General', row: 19, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.3',  section: 'Biocides', subsection: 'General', row: 22, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.4',  section: 'Biocides', subsection: 'General', row: 25, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.5',  section: 'Biocides', subsection: 'General', row: 28, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.6',  section: 'Biocides', subsection: 'General', row: 31, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.7',  section: 'Biocides', subsection: 'General', row: 34, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.8',  section: 'Biocides', subsection: 'General', row: 37, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.9',  section: 'Biocides', subsection: 'General', row: 40, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },
  { code: '3.1.10', section: 'Biocides', subsection: 'General', row: 43, tab: 'Biocides', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },

  // ── Section 4: Food Contact ───────────────────────────────────────────────
  // 4.1 General
  { code: '4.1.1', section: 'Food Contact', subsection: 'General', row: 4, tab: 'Food Contact', answerType: 'YNRNA', jurisdiction: 'GLOBAL', pattern: 'simple' },

  // 4.2 EU Framework Regulation
  { code: '4.2.1', section: 'Food Contact', subsection: 'EU Framework Regulation', row: 12, tab: 'Food Contact', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'simple' },

  // 4.3 Germany (BfR recommendations)
  { code: '4.3.1', section: 'Food Contact', subsection: 'Germany', row: 18, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'DE', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.3.2', section: 'Food Contact', subsection: 'Germany', row: 33, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'DE', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.3.3', section: 'Food Contact', subsection: 'Germany', row: 48, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'DE', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.3.4', section: 'Food Contact', subsection: 'Germany', row: 63, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'DE', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.3.5', section: 'Food Contact', subsection: 'Germany', row: 78, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'DE', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },

  // 4.4 Netherlands
  { code: '4.4.1', section: 'Food Contact', subsection: 'Netherlands', row: 97, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'NL', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.4.2', section: 'Food Contact', subsection: 'Netherlands', row: 112, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'NL', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },

  // 4.5 Switzerland
  { code: '4.5.1', section: 'Food Contact', subsection: 'Switzerland', row: 128, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'CH', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },

  // 4.6 Italy
  { code: '4.6.1', section: 'Food Contact', subsection: 'Italy', row: 144, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'IT', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },

  // 4.7 France
  { code: '4.7.1', section: 'Food Contact', subsection: 'France', row: 160, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'FR', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },

  // 4.8 EU Plastics and Dual Use
  { code: '4.8.1', section: 'Food Contact', subsection: 'EU Plastics and Dual Use', row: 182, tab: 'Food Contact', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'food_contact_plastics' },

  // 4.9 USA
  { code: '4.9.1', section: 'Food Contact', subsection: 'USA', row: 201, tab: 'Food Contact', answerType: 'YNNA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },
  { code: '4.9.2', section: 'Food Contact', subsection: 'USA', row: 216, tab: 'Food Contact', answerType: 'YNNA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },
  { code: '4.9.3', section: 'Food Contact', subsection: 'USA', row: 231, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },
  { code: '4.9.4', section: 'Food Contact', subsection: 'USA', row: 246, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },
  { code: '4.9.5', section: 'Food Contact', subsection: 'USA', row: 261, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },
  { code: '4.9.6', section: 'Food Contact', subsection: 'USA', row: 276, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },
  { code: '4.9.7', section: 'Food Contact', subsection: 'USA', row: 291, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },
  { code: '4.9.8', section: 'Food Contact', subsection: 'USA', row: 306, tab: 'Food Contact', answerType: 'YN', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'food_contact_us' },

  // 4.10 China
  { code: '4.10.1', section: 'Food Contact', subsection: 'China', row: 327, tab: 'Food Contact', answerType: 'YNNA', jurisdiction: 'CN', pattern: 'simple' },
  { code: '4.10.2', section: 'Food Contact', subsection: 'China', row: 330, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'CN', pattern: 'simple' },
  { code: '4.10.3', section: 'Food Contact', subsection: 'China', row: 333, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'CN', pattern: 'with_detail_table', detailSchema: 'food_contact_china' },
  { code: '4.10.4', section: 'Food Contact', subsection: 'China', row: 348, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'CN', pattern: 'with_detail_table', detailSchema: 'food_contact_china' },

  // 4.11 South America (MERCOSUR)
  { code: '4.11.1', section: 'Food Contact', subsection: 'South America', row: 366, tab: 'Food Contact', answerType: 'YNNA', jurisdiction: 'MERCOSUR', pattern: 'simple' },
  { code: '4.11.2', section: 'Food Contact', subsection: 'South America', row: 369, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'MERCOSUR', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.11.3', section: 'Food Contact', subsection: 'South America', row: 384, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'MERCOSUR', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.11.4', section: 'Food Contact', subsection: 'South America', row: 399, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'MERCOSUR', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.11.5', section: 'Food Contact', subsection: 'South America', row: 414, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'MERCOSUR', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },
  { code: '4.11.6', section: 'Food Contact', subsection: 'South America', row: 429, tab: 'Food Contact', answerType: 'YNNANA', jurisdiction: 'MERCOSUR', pattern: 'with_detail_table', detailSchema: 'food_contact_eu' },

  // ── Section 5: PIDSL ──────────────────────────────────────────────────────
  { code: '5.1.1', section: 'PIDSL', subsection: 'General', row: 5, tab: 'PIDSL', answerType: 'YNNINE', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.2', section: 'PIDSL', subsection: 'General', row: 20, tab: 'PIDSL', answerType: 'YNNINE', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.3', section: 'PIDSL', subsection: 'General', row: 35, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.4', section: 'PIDSL', subsection: 'General', row: 50, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.5', section: 'PIDSL', subsection: 'General', row: 65, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.6', section: 'PIDSL', subsection: 'General', row: 80, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.7', section: 'PIDSL', subsection: 'General', row: 95, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.8', section: 'PIDSL', subsection: 'General', row: 110, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.9', section: 'PIDSL', subsection: 'General', row: 125, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.10', section: 'PIDSL', subsection: 'General', row: 140, tab: 'PIDSL', answerType: 'Prop65', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'pidsl' },
  { code: '5.1.11', section: 'PIDSL', subsection: 'General', row: 155, tab: 'PIDSL', answerType: 'YNNINE2', jurisdiction: 'GLOBAL', pattern: 'with_detail_table', detailSchema: 'pidsl' },

  // ── Section 6: Additional Requirements ────────────────────────────────────
  // 6.1 Kosher and Halal
  { code: '6.1.1', section: 'Additional Requirements', subsection: 'Kosher and Halal', row: 6, tab: 'Additional Requirements', answerType: 'YKYKPN', jurisdiction: 'GLOBAL', pattern: 'simple' },
  { code: '6.1.2', section: 'Additional Requirements', subsection: 'Kosher and Halal', row: 7, tab: 'Additional Requirements', answerType: 'YHN', jurisdiction: 'GLOBAL', pattern: 'simple' },

  // 6.2 Kosher Passover
  { code: '6.2.1', section: 'Additional Requirements', subsection: 'Kosher Passover', row: 11, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'GLOBAL', pattern: 'with_detail_table', detailSchema: 'substance_basic' },

  // 6.3 Animal Origin
  { code: '6.3.1', section: 'Additional Requirements', subsection: 'Animal Origin', row: 23, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'GLOBAL', pattern: 'with_detail_table', detailSchema: 'substance_basic' },

  // 6.4 BSE/TSE
  { code: '6.4.1', section: 'Additional Requirements', subsection: 'BSE/TSE', row: 40, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'GLOBAL', pattern: 'simple' },

  // 6.5 Ethanol
  { code: '6.5.1', section: 'Additional Requirements', subsection: 'Ethanol', row: 45, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'GLOBAL', pattern: 'simple' },
  { code: '6.5.2', section: 'Additional Requirements', subsection: 'Ethanol', row: 48, tab: 'Additional Requirements', answerType: 'YNNE', jurisdiction: 'GLOBAL', pattern: 'simple' },

  // 6.6 Allergens
  { code: '6.6.1', section: 'Additional Requirements', subsection: 'Allergens', row: 53, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'allergen' },
  { code: '6.6.2', section: 'Additional Requirements', subsection: 'Allergens', row: 68, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'US', pattern: 'with_detail_table', detailSchema: 'allergen' },

  // 6.7 Nanomaterials
  { code: '6.7.1', section: 'Additional Requirements', subsection: 'Nanomaterials', row: 85, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'substance_basic' },

  // 6.8 GMO
  { code: '6.8.1', section: 'Additional Requirements', subsection: 'GMO', row: 102, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'EU', pattern: 'with_detail_table', detailSchema: 'substance_basic' },

  // 6.9 Mineral Oil (MOSH/MOAH)
  { code: '6.9.1', section: 'Additional Requirements', subsection: 'Mineral Oil (MOSH/MOAH)', row: 119, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'GLOBAL', pattern: 'simple' },

  // 6.10 Conflict Minerals
  { code: '6.10.1', section: 'Additional Requirements', subsection: 'Conflict Minerals', row: 128, tab: 'Additional Requirements', answerType: 'YNNA', jurisdiction: 'GLOBAL', pattern: 'with_detail_table', detailSchema: 'substance_basic' },

  // 6.11 Palm Oil
  { code: '6.11.1', section: 'Additional Requirements', subsection: 'Palm Oil', row: 145, tab: 'Additional Requirements', answerType: 'YYYNNA', jurisdiction: 'GLOBAL', pattern: 'simple' },
];

// ─── Helper: read cell value from sheet ──────────────────────────────────────

function cellVal(sheet: XLSX.WorkSheet, col: string, row: number): string {
  const addr = `${col}${row}`;
  const cell = sheet[addr];
  return cell?.v !== undefined ? String(cell.v).trim() : '';
}

// ─── Parse answer types from Drop-Downs tab ──────────────────────────────────

function parseAnswerTypes(wb: XLSX.WorkBook) {
  // Use named ranges for precise definitions
  const names = wb.Workbook?.Names ?? [];
  const ddSheet = wb.Sheets['Drop-Downs'];
  if (!ddSheet) throw new Error('Drop-Downs tab not found');

  const ANSWER_TYPE_LABELS: Record<string, string> = {
    YNRNA: 'Yes / Not recommended / Not assessed',
    YNNA: 'Yes / No / Not assessed',
    YNNANA: 'Yes / No / Not assessed / Not applicable',
    YN: 'Yes / No',
    YNNINE: 'Yes / No (not above limit) / Not intentionally added / Not evaluated',
    YNNANA2: 'Yes (meets criteria) / No (does not meet) / Not assessed / Not applicable',
    YNNA2: 'Yes / No / Not applicable',
    YPPNNP: 'MySwan product listing status',
    YKYKPN: 'Kosher certification status',
    YHN: 'Halal certification',
    YNINA: 'Yes / No (not intentionally added) / Not assessed',
    YNNE: 'Yes / No / Not Evaluated',
    YYYNNA: 'Certification source status',
    CS: 'Certificate / Statement',
    DND: 'Declaration uploaded / No declaration available',
    YNNINE2: 'Yes / No (not above limit) / Not intentionally added / Not evaluated (variant)',
    EUEco: 'EU Ecolabel compliance status',
    Prop65: 'California Proposition 65 status',
  };

  const answerTypes: Array<{ code: string; label: string; options: string[] }> = [];

  for (const namedRange of names) {
    const name = namedRange.Name;
    if (name.startsWith('_xlnm.')) continue; // Skip built-in names

    const ref = namedRange.Ref;
    if (!ref || !ref.includes('Drop-Downs')) continue;

    // Parse ref like "'Drop-Downs'!$A$2:$A$4"
    const rangeMatch = ref.match(/\$([A-Z]+)\$(\d+):\$([A-Z]+)\$(\d+)/);
    if (!rangeMatch) continue;

    const col = rangeMatch[1];
    const startRow = parseInt(rangeMatch[2]);
    const endRow = parseInt(rangeMatch[4]);

    const options: string[] = [];
    for (let r = startRow; r <= endRow; r++) {
      const val = cellVal(ddSheet, col, r);
      if (val) options.push(val);
    }

    answerTypes.push({
      code: name,
      label: ANSWER_TYPE_LABELS[name] || name,
      options,
    });
  }

  return answerTypes;
}

// ─── Parse canonical parameters from workbook ────────────────────────────────

function parseParameters(wb: XLSX.WorkBook) {
  const params: Array<{
    code: string;
    section: string;
    subsection: string;
    name: string;
    description: string | null;
    jurisdiction: string;
    answer_type_code: string;
    answer_pattern: string;
    detail_table_schema: object | null;
    sort_order: number;
    is_active: boolean;
  }> = [];

  for (let i = 0; i < PARAMS.length; i++) {
    const p = PARAMS[i];
    const sheet = wb.Sheets[p.tab];
    if (!sheet) {
      console.warn(`Tab "${p.tab}" not found, skipping ${p.code}`);
      continue;
    }

    const name = cellVal(sheet, 'B', p.row);
    if (!name) {
      console.warn(`Empty question text at ${p.tab}!B${p.row} for ${p.code}`);
    }

    params.push({
      code: p.code,
      section: p.section,
      subsection: p.subsection,
      name: name || `[Question at ${p.tab} row ${p.row}]`,
      description: null,
      jurisdiction: p.jurisdiction,
      answer_type_code: p.answerType,
      answer_pattern: p.pattern,
      detail_table_schema: p.detailSchema ? DETAIL_SCHEMAS[p.detailSchema] : null,
      sort_order: i + 1,
      is_active: true,
    });
  }

  return params;
}

// ─── Parse PIDSL reference substances ────────────────────────────────────────

function parseReferenceSubstances(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets['PIDSL'];
  if (!sheet) throw new Error('PIDSL tab not found');

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const substances: Array<{
    cas_number: string | null;
    ec_number: string | null;
    chemical_name: string;
    reason: string | null;
    application: string | null;
    declaration_level_ppm: string | null;
    sort_order: number;
    is_active: boolean;
  }> = [];

  // Substance list starts at row 173 (header at 172)
  let order = 0;
  for (let r = 173; r <= range.e.r + 1; r++) {
    const chemName = cellVal(sheet, 'D', r);
    if (!chemName) continue; // Skip empty rows

    const cas = cellVal(sheet, 'B', r) || null;
    const ec = cellVal(sheet, 'C', r) || null;
    const reason = cellVal(sheet, 'H', r) || null;
    const application = cellVal(sheet, 'I', r) || null;
    const declLevel = cellVal(sheet, 'J', r) || null;

    order++;
    substances.push({
      cas_number: cas,
      ec_number: ec === '-' ? null : ec,
      chemical_name: chemName,
      reason,
      application,
      declaration_level_ppm: declLevel,
      sort_order: order,
      is_active: true,
    });
  }

  return substances;
}

// ─── Snapshot existing table counts ──────────────────────────────────────────

async function snapshotCounts() {
  const tables = ['questions', 'answers', 'sheets'];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn(`Could not count ${table}: ${error.message}`);
      counts[table] = -1;
    } else {
      counts[table] = count ?? 0;
    }
  }

  return counts;
}

// ─── Main seed function ──────────────────────────────────────────────────────

async function seed() {
  console.log('Reading workbook:', WORKBOOK_PATH);
  const wb = XLSX.readFile(WORKBOOK_PATH);

  // 1. Snapshot existing tables
  console.log('\n--- Before snapshot ---');
  const before = await snapshotCounts();
  for (const [table, count] of Object.entries(before)) {
    console.log(`  ${table}: ${count} rows`);
  }

  // 2. Parse answer types
  console.log('\n--- Parsing answer types ---');
  const answerTypes = parseAnswerTypes(wb);
  console.log(`  Found ${answerTypes.length} answer types`);

  // 3. Insert answer types (upsert on code)
  console.log('\n--- Inserting answer types ---');
  const { error: atError } = await supabase
    .from('canonical_answer_types')
    .upsert(
      answerTypes.map(at => ({
        code: at.code,
        label: at.label,
        options: at.options,
      })),
      { onConflict: 'code' }
    );

  if (atError) {
    console.error('Failed to insert answer types:', atError.message);
    process.exit(1);
  }
  console.log(`  Inserted/updated ${answerTypes.length} answer types`);

  // 4. Parse parameters
  console.log('\n--- Parsing parameters ---');
  const params = parseParameters(wb);
  console.log(`  Found ${params.length} parameters`);

  // Validate all answer types exist
  const validCodes = new Set(answerTypes.map(at => at.code));
  const invalidParams = params.filter(p => !validCodes.has(p.answer_type_code));
  if (invalidParams.length > 0) {
    console.error('Parameters with invalid answer_type_code:');
    invalidParams.forEach(p => console.error(`  ${p.code}: ${p.answer_type_code}`));
    process.exit(1);
  }

  // 5. Insert parameters (upsert on code)
  console.log('\n--- Inserting parameters ---');
  // Insert in batches of 20
  for (let i = 0; i < params.length; i += 20) {
    const batch = params.slice(i, i + 20);
    const { error: pError } = await supabase
      .from('canonical_parameters')
      .upsert(batch, { onConflict: 'code' });

    if (pError) {
      console.error(`Failed to insert parameters batch ${i}:`, pError.message);
      process.exit(1);
    }
  }
  console.log(`  Inserted/updated ${params.length} parameters`);

  // 6. Parse reference substances
  console.log('\n--- Parsing reference substances ---');
  const substances = parseReferenceSubstances(wb);
  console.log(`  Found ${substances.length} substances`);

  // 7. Insert reference substances (clear and re-insert for idempotency)
  console.log('\n--- Inserting reference substances ---');
  // Delete all existing, then insert fresh
  await supabase.from('canonical_reference_substances').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  for (let i = 0; i < substances.length; i += 50) {
    const batch = substances.slice(i, i + 50);
    const { error: sError } = await supabase
      .from('canonical_reference_substances')
      .insert(batch);

    if (sError) {
      console.error(`Failed to insert substances batch ${i}:`, sError.message);
      process.exit(1);
    }
  }
  console.log(`  Inserted ${substances.length} substances`);

  // 8. After snapshot
  console.log('\n--- After snapshot ---');
  const after = await snapshotCounts();
  for (const [table, count] of Object.entries(after)) {
    const diff = count - (before[table] ?? 0);
    const status = diff === 0 ? 'UNCHANGED' : `CHANGED (${diff > 0 ? '+' : ''}${diff})`;
    console.log(`  ${table}: ${count} rows [${status}]`);
  }

  // 9. Validation summary
  console.log('\n--- Validation Summary ---');
  const withDetail = params.filter(p => p.answer_pattern === 'with_detail_table');
  const withDetailSchema = withDetail.filter(p => p.detail_table_schema !== null);
  const sections = [...new Set(params.map(p => p.section))];
  const subsections = [...new Set(params.map(p => `${p.section} > ${p.subsection}`))];

  console.log(`  Total parameters: ${params.length}`);
  console.log(`  Sections: ${sections.length} (${sections.join(', ')})`);
  console.log(`  Subsections: ${subsections.length}`);
  console.log(`  Answer types used: ${new Set(params.map(p => p.answer_type_code)).size}`);
  console.log(`  Simple answers: ${params.length - withDetail.length}`);
  console.log(`  With detail table: ${withDetail.length} (all have schema: ${withDetailSchema.length === withDetail.length})`);
  console.log(`  Reference substances: ${substances.length}`);
  console.log(`  Existing tables modified: ${Object.entries(after).some(([t, c]) => c !== before[t]) ? 'YES - WARNING!' : 'No (safe)'}`);

  console.log('\nDone.');
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// ============================================================================
// MOCK DATA - All real compliance data for the Stacks Vision Demo
// Single source of truth for every piece of text shown in the demo.
// Based on real product: Pentasize 8A by Aurorium UK Ltd.
// ============================================================================

// ---------------------------------------------------------------------------
// SOURCE DOCUMENTS (Act 1: Supplier Island)
// ---------------------------------------------------------------------------

export const sdsDocument = {
  title: 'SAFETY DATA SHEET',
  subtitle: 'According to Regulation (EC) No 1907/2006 (REACH), Annex II',
  revision: 'Revision Date: 2024-09-12 | Version 4.2',
  fields: {
    productName: 'Pentasize 8A',
    manufacturer: 'Aurorium UK Ltd.',
    address: '24 Blacklands Way, Abingdon OX14 1DY, United Kingdom',
    casNumbers: '68784-12-3; 577-11-7',
    chemicalCharacterization: 'Anionic paper sizing agent based on alkenyl succinic anhydride (ASA)',
    hazardClassification: 'H302 — Harmful if swallowed',
    ghsSignalWord: 'Warning',
    precautionary: 'P264 — Wash hands thoroughly after handling',
  },
  composition: [
    { name: 'Alkenyl Succinic Anhydride (ASA)', cas: '68784-12-3', range: '45–55%', clp: 'H302' },
    { name: 'Dioctyl Sodium Sulfosuccinate', cas: '577-11-7', range: '5–10%', clp: 'H302, H315' },
    { name: 'Water', cas: '7732-18-5', range: '35–50%', clp: '—' },
  ],
}

export const sapExportTable = {
  title: 'SAP Material Master Export',
  system: 'SAP ECC 6.0 — Plant: GB10 Manchester',
  batch: 'BN-2024-0847',
  productionSite: 'Manchester, UK',
  exportDate: '2024-12-01',
  rows: [
    { materialNo: 'MAT-40291', description: 'ASA Emulsion', cas: '68784-12-3', concentration: 48.2, unit: '%', status: 'Active' },
    { materialNo: 'MAT-40292', description: 'DOSS', cas: '577-11-7', concentration: 7.3, unit: '%', status: 'Active' },
    { materialNo: 'MAT-40293', description: 'Deionized H\u2082O', cas: '7732-18-5', concentration: 44.5, unit: '%', status: 'Active' },
  ],
}

export const excelLabResults = {
  title: 'Migration Testing Report',
  standard: 'EU Regulation 10/2011 on plastic materials and articles intended to come into contact with food',
  lab: 'SGS Institute Fresenius GmbH',
  reportNumber: 'MIG-2024-08471',
  testDate: '2024-11-15',
  simulant: '10% Ethanol (Simulant A)',
  contactConditions: '40\u00B0C / 10 days',
  results: [
    { substance: 'ASA monomer', sml: 0.05, result: '<0.01', unit: 'mg/kg', pass: true },
    { substance: 'Formaldehyde', sml: 15.0, result: '2.3', unit: 'mg/kg', pass: true },
    { substance: 'Primary aromatic amines', sml: 0.01, result: '<0.01', unit: 'mg/kg', pass: true },
    { substance: 'Overall migration', sml: 10.0, result: '3.7', unit: 'mg/dm\u00B2', pass: true },
  ],
}

export const coaDocument = {
  title: 'CERTIFICATE OF ANALYSIS',
  product: 'Pentasize 8A',
  batch: 'BN-2024-0847',
  dateOfManufacture: '2024-10-22',
  dateOfAnalysis: '2024-10-23',
  results: [
    { parameter: 'Viscosity (25\u00B0C)', value: '42 mPa\u00B7s', spec: '35\u201350', pass: true },
    { parameter: 'Solids Content', value: '52.1%', spec: '50\u201355%', pass: true },
    { parameter: 'pH (neat)', value: '3.2', spec: '2.8\u20133.8', pass: true },
    { parameter: 'Appearance', value: 'Milky white emulsion', spec: 'White to off-white', pass: true },
  ],
  shelfLife: '6 months from date of manufacture',
  conclusion: 'Product meets all release specifications.',
}

// ---------------------------------------------------------------------------
// DATA CHIPS (Act 2: Chipper Output — normalized Stacks format)
// ---------------------------------------------------------------------------

export type ChipCategory = 'identity' | 'quantitative' | 'safety' | 'compliance' | 'traceability'

export interface DataChip {
  label: string
  value: string
  category: ChipCategory
}

export const chipCategoryColors: Record<ChipCategory, { bg: string; text: string; border: string }> = {
  identity:     { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  quantitative: { bg: 'bg-blue-500/15',    text: 'text-blue-300',    border: 'border-blue-500/30' },
  safety:       { bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30' },
  compliance:   { bg: 'bg-violet-500/15',  text: 'text-violet-300',  border: 'border-violet-500/30' },
  traceability: { bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/30' },
}

export const dataChips: DataChip[] = [
  // Identity (emerald)
  { label: 'CAS', value: '68784-12-3', category: 'identity' },
  { label: 'CAS', value: '577-11-7', category: 'identity' },
  { label: 'CAS', value: '7732-18-5', category: 'identity' },
  { label: 'Product', value: 'Pentasize 8A', category: 'identity' },
  { label: 'Function', value: 'Paper sizing agent', category: 'identity' },
  // Quantitative (blue)
  { label: 'Conc', value: '48.2%', category: 'quantitative' },
  { label: 'Conc', value: '7.3%', category: 'quantitative' },
  { label: 'Conc', value: '44.5%', category: 'quantitative' },
  { label: 'Viscosity', value: '42 mPa\u00B7s', category: 'quantitative' },
  { label: 'Solids', value: '52.1%', category: 'quantitative' },
  // Safety (amber)
  { label: 'GHS', value: 'H302', category: 'safety' },
  { label: 'Signal', value: 'Warning', category: 'safety' },
  { label: 'CLP', value: 'H302, H315', category: 'safety' },
  // Compliance (violet)
  { label: 'Migration', value: 'ASA <0.01 mg/kg', category: 'compliance' },
  { label: 'Migration', value: 'CH\u2082O 2.3 mg/kg', category: 'compliance' },
  { label: 'Overall', value: '3.7 mg/dm\u00B2', category: 'compliance' },
  { label: 'SML', value: 'All PASS', category: 'compliance' },
  // Traceability (rose)
  { label: 'Batch', value: 'BN-2024-0847', category: 'traceability' },
  { label: 'Site', value: 'Manchester, UK', category: 'traceability' },
  { label: 'Date', value: '2024-10-22', category: 'traceability' },
  { label: 'Producer', value: 'Aurorium UK Ltd.', category: 'traceability' },
]

// ---------------------------------------------------------------------------
// REGULATORY LANES (Act 4: Stacks Intelligence Layer)
// ---------------------------------------------------------------------------

export interface RegulatoryField {
  label: string
  value: string
  status: 'pass' | 'info' | 'warning'
}

export interface RegulatoryLaneData {
  id: string
  name: string
  flag: string
  region: string
  color: string
  fields: RegulatoryField[]
}

export const regulatoryLanes: RegulatoryLaneData[] = [
  {
    id: 'reach',
    name: 'REACH',
    flag: '\uD83C\uDDEA\uD83C\uDDFA',
    region: 'European Union',
    color: 'blue',
    fields: [
      { label: 'SVHC Declaration', value: 'Product does not contain SVHC >0.1% w/w (Art. 33)', status: 'pass' },
      { label: 'Annex XVII', value: 'No restricted substances detected', status: 'pass' },
      { label: 'CLP Classification', value: 'H302 \u2014 Regulation (EC) 1272/2008', status: 'info' },
      { label: 'Authorization', value: 'Not required (Annex XIV)', status: 'pass' },
    ],
  },
  {
    id: 'tsca',
    name: 'TSCA',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    region: 'United States',
    color: 'red',
    fields: [
      { label: 'EPA Inventory', value: 'All substances listed on TSCA inventory', status: 'pass' },
      { label: '21 CFR 176.170', value: 'Substances authorized for food contact', status: 'pass' },
      { label: 'SNUR', value: 'No Significant New Use Rules applicable', status: 'pass' },
      { label: 'Prop 65', value: 'No listed substances detected', status: 'pass' },
    ],
  },
  {
    id: 'china',
    name: 'China EPA',
    flag: '\uD83C\uDDE8\uD83C\uDDF3',
    region: 'China',
    color: 'rose',
    fields: [
      { label: 'GB 9685-2016', value: 'Food contact materials \u2014 Compliant', status: 'pass' },
      { label: 'IECSC', value: 'All substances registered on inventory', status: 'pass' },
      { label: 'MEE Notification', value: 'Current registration active', status: 'pass' },
    ],
  },
  {
    id: 'kreach',
    name: 'K-REACH',
    flag: '\uD83C\uDDF0\uD83C\uDDF7',
    region: 'South Korea',
    color: 'sky',
    fields: [
      { label: 'Registration', value: 'Pre-registered substances (Phase 3)', status: 'pass' },
      { label: 'MFDS', value: 'Positive list status confirmed', status: 'pass' },
    ],
  },
  {
    id: 'dpp',
    name: 'Digital Product Passport',
    flag: '\uD83C\uDDEA\uD83C\uDDFA',
    region: 'EU \u2014 ESPR 2024/1781',
    color: 'emerald',
    fields: [
      { label: 'Material Composition', value: 'ASA 48.2% | DOSS 7.3% | H\u2082O 44.5%', status: 'info' },
      { label: 'Carbon Footprint', value: '2.4 kg CO\u2082e/kg (cradle-to-gate)', status: 'info' },
      { label: 'Recyclability', value: '78% recoverable material', status: 'pass' },
      { label: 'Facility', value: 'Manchester, UK \u2014 GS1 GLN 5012345000019', status: 'info' },
      { label: 'ESPR Status', value: 'Ready for 2027 mandate', status: 'pass' },
    ],
  },
  {
    id: 'bfr',
    name: 'BfR Recommendations',
    flag: '\uD83C\uDDE9\uD83C\uDDEA',
    region: 'Germany',
    color: 'amber',
    fields: [
      { label: 'Rec. XXXVI', value: 'Paper & board for food contact \u2014 Compliant', status: 'pass' },
      { label: 'Positive List', value: 'All substances listed', status: 'pass' },
      { label: 'Migration Limits', value: 'Compliant per BfR evaluation criteria', status: 'pass' },
    ],
  },
]

// ---------------------------------------------------------------------------
// OUTPUT DOCUMENTS (Act 5: Customer Outputs)
// ---------------------------------------------------------------------------

export interface OutputDocument {
  id: string
  title: string
  subtitle: string
  format: string
  region: string
  flag: string
  color: string
}

export const outputDocuments: OutputDocument[] = [
  {
    id: 'reach-declaration',
    title: 'REACH SVHC Declaration',
    subtitle: 'Erkl\u00E4rung gem\u00E4\u00DF Artikel 33 der Verordnung (EG) Nr. 1907/2006',
    format: 'PDF',
    region: 'EU',
    flag: '\uD83C\uDDE9\uD83C\uDDEA',
    color: 'blue',
  },
  {
    id: 'fda-letter',
    title: 'FDA Compliance Letter',
    subtitle: 'Statement of compliance per 21 CFR \u00A7176.170, \u00A7176.300',
    format: 'PDF',
    region: 'US',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    color: 'red',
  },
  {
    id: 'dpp-credential',
    title: 'Digital Product Passport',
    subtitle: 'W3C Verifiable Credential \u2014 ESPR 2024/1781',
    format: 'JSON-LD',
    region: 'EU',
    flag: '\uD83C\uDDEA\uD83C\uDDFA',
    color: 'emerald',
  },
  {
    id: 'china-cert',
    title: 'GB Compliance Certificate',
    subtitle: '\u98DF\u54C1\u63A5\u89E6\u6750\u6599\u5408\u89C4\u8BC1\u660E \u2014 GB 9685-2016',
    format: 'PDF',
    region: 'CN',
    flag: '\uD83C\uDDE8\uD83C\uDDF3',
    color: 'rose',
  },
]

// ---------------------------------------------------------------------------
// CUSTOMER CARD (Act 2: Inserted into the chipper)
// ---------------------------------------------------------------------------

export const customerCard = {
  companyName: 'Packaging Corp GmbH',
  requestType: 'REACH SVHC Declaration Request',
  questionCount: 47,
  frameworks: ['REACH', 'CLP', 'EU 10/2011', 'BfR XXXVI'],
  dueDate: '2025-01-15',
}

// ---------------------------------------------------------------------------
// ACT DEFINITIONS
// ---------------------------------------------------------------------------

export const actDefinitions = [
  {
    id: 1,
    title: 'The Source',
    subtitle: 'Supplier Island',
    tagline: '4 documents. 3 formats. 1 product.',
  },
  {
    id: 2,
    title: 'The Extraction',
    subtitle: 'The Chipper',
    tagline: 'Extracted. Normalized. Machine-readable.',
  },
  {
    id: 3,
    title: 'The Journey',
    subtitle: 'Across the Globe',
    tagline: 'One universal format. Every destination.',
  },
  {
    id: 4,
    title: 'The Intelligence',
    subtitle: 'Stacks Data Layer',
    tagline: '6 frameworks. 0 manual entry.',
  },
  {
    id: 5,
    title: 'The Delivery',
    subtitle: 'Customer Desk',
    tagline: 'Complete. Compliant. Delivered.',
  },
]

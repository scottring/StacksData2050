/**
 * Seed data for regulatory frameworks and rules.
 * CAS lists sourced from the existing enrichment script + expanded.
 * Used to insert into regulatory_frameworks and regulatory_rules tables.
 */

import type { RuleConfig, Severity } from './types'

// ─── CAS Lists ──────────────────────────────────────────────

export const REACH_SVHC_CAS: string[] = [
  '50-00-0',    // Formaldehyde
  '111-30-8',   // Glutaraldehyde
  '10108-64-2', // Cadmium chloride
  '1303-96-4',  // Sodium tetraborate, decahydrate (Borax)
  '1344-37-2',  // Lead sulfochromate yellow
  '7439-92-1',  // Lead
  '7784-40-9',  // Lead hydrogen arsenate
  '108-31-6',   // Maleic anhydride
  '117-81-7',   // Bis(2-ethylhexyl) phthalate (DEHP)
  '84-74-2',    // Dibutyl phthalate (DBP)
  '85-68-7',    // Butyl benzyl phthalate (BBP)
  '117-82-8',   // Bis(2-methoxyethyl) phthalate
  '56-35-9',    // Bis(tributyltin) oxide (TBTO)
  '36437-37-3', // UV-328
  '25973-55-1', // DOTE
  '93925-08-5', // 2-benzyl-2-dimethylamino-4'-morpholinobutyrophenone
  '71-43-2',    // Benzene
  '7440-43-9',  // Cadmium
  '7440-02-0',  // Nickel compounds
  '18540-29-9', // Chromium (VI)
  '7439-97-6',  // Mercury
  '1327-53-3',  // Arsenic trioxide
  '79-06-1',    // Acrylamide
  '106-99-0',   // 1,3-Butadiene
  '120-12-7',   // Anthracene
  '84-69-5',    // Diisobutyl phthalate (DIBP)
  '84-75-3',    // Di-n-hexyl phthalate
  '119-61-9',   // Benzophenone
  '131-56-6',   // 2,4-Dihydroxybenzophenone
  '80-46-6',    // 4-tert-Pentylphenol
  '140-66-9',   // 4-tert-Octylphenol
  '27193-28-8', // 4-tert-Octylphenol (branched)
  '335-67-1',   // PFOA
  '1763-23-1',  // PFOS
  '115-96-8',   // TCEP (tris(2-chloroethyl) phosphate)
  '13674-87-8', // TDCPP (tris(1,3-dichloro-2-propyl) phosphate)
]

export const PROP_65_CAS: string[] = [
  '50-00-0',    // Formaldehyde
  '75-07-0',    // Acetaldehyde
  '107-13-1',   // Acrylonitrile
  '71-43-2',    // Benzene
  '106-99-0',   // 1,3-Butadiene
  '75-01-4',    // Vinyl chloride
  '67-66-3',    // Chloroform
  '106-46-7',   // 1,4-Dichlorobenzene
  '117-81-7',   // DEHP
  '84-74-2',    // DBP
  '85-68-7',    // BBP
  '7439-92-1',  // Lead
  '7440-02-0',  // Nickel
  '7440-43-9',  // Cadmium
  '7440-47-3',  // Chromium
  '108-95-2',   // Phenol
  '90-43-7',    // 2-Phenylphenol
  '79-06-1',    // Acrylamide
  '1332-21-4',  // Asbestos
  '7440-38-2',  // Arsenic
  '7439-97-6',  // Mercury
  '18540-29-9', // Chromium (VI)
  '75-09-2',    // Methylene chloride
  '79-01-6',    // Trichloroethylene
  '127-18-4',   // Tetrachloroethylene
  '100-42-5',   // Styrene
  '1634-04-4',  // MTBE
  '56-55-3',    // Benz[a]anthracene
  '50-32-8',    // Benzo[a]pyrene
]

export const PFAS_CAS: string[] = [
  '335-67-1',   // PFOA
  '1763-23-1',  // PFOS
  '375-95-1',   // PFNA
  '72629-94-8', // PFHxS
  '3825-26-1',  // PFHxA
  '335-76-2',   // PFPeA
  '2058-94-8',  // PFBS
  '375-73-5',   // PFBA
]

export const BFR_FOOD_CONTACT_RESTRICTED_CAS: string[] = [
  '50-00-0',    // Formaldehyde
  '80-05-7',    // Bisphenol A (BPA)
  '117-81-7',   // DEHP
  '84-74-2',    // DBP
  '85-68-7',    // BBP
  ...PFAS_CAS,
]

export const ROHS_RESTRICTED_CAS: string[] = [
  '7439-92-1',  // Lead
  '7439-97-6',  // Mercury
  '7440-43-9',  // Cadmium
  '18540-29-9', // Chromium (VI)
  '1336-36-3',  // PCBs
  '32534-81-9', // PentaBDE
  '40088-47-9', // HexaBDE (commercial mixture)
  '117-81-7',   // DEHP
  '84-74-2',    // DBP
  '85-68-7',    // BBP
  '84-69-5',    // DIBP
]

// ─── Framework Definitions ──────────────────────────────────

export interface FrameworkSeed {
  code: string
  name: string
  jurisdiction: string
  description: string
  version: string
  rules: RuleSeed[]
}

export interface RuleSeed {
  code: string
  name: string
  category: string
  rule_type: 'cas_list' | 'concentration_threshold' | 'property_check' | 'custom'
  rule_config: RuleConfig
  severity: Severity
  message_template: string
  remediation_text: string | null
}

export const FRAMEWORK_SEEDS: FrameworkSeed[] = [
  // ─── REACH (EU) ─────────────────────────────────────
  {
    code: 'reach',
    name: 'REACH',
    jurisdiction: 'EU',
    description: 'Registration, Evaluation, Authorisation and Restriction of Chemicals',
    version: '2024/01',
    rules: [
      {
        code: 'reach-svhc-list',
        name: 'SVHC Candidate List Check',
        category: 'Authorization',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: REACH_SVHC_CAS,
          list_name: 'REACH SVHC Candidate List',
        },
        severity: 'warning',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Substances on the SVHC candidate list require notification to ECHA if concentration exceeds 0.1% w/w in articles. Consider substitution.',
      },
      {
        code: 'reach-svhc-threshold',
        name: 'SVHC Concentration Threshold (0.1% w/w)',
        category: 'Authorization',
        rule_type: 'concentration_threshold',
        rule_config: {
          type: 'concentration_threshold',
          threshold_pct: 0.1,
          operator: '>',
          applies_to: REACH_SVHC_CAS,
          list_name: 'REACH SVHC',
        },
        severity: 'fail',
        message_template: '{status}. SVHC concentration exceeds {threshold} w/w threshold: {chemicals}.',
        remediation_text: 'SVHC above 0.1% w/w in articles triggers SCIP database notification, supply chain communication obligation, and potential authorization requirement.',
      },
      {
        code: 'reach-clp-hazard',
        name: 'CLP Classification Check',
        category: 'Classification',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: ['71-43-2', '50-00-0', '79-06-1', '106-99-0', '75-01-4'],
          list_name: 'CLP Carcinogen/Mutagen/Reprotoxic List (CMR)',
        },
        severity: 'warning',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Substances classified as CMR (Carcinogenic, Mutagenic, or toxic to Reproduction) under CLP require additional labelling and restrictions.',
      },
    ],
  },

  // ─── TSCA (US) ──────────────────────────────────────
  {
    code: 'tsca',
    name: 'TSCA',
    jurisdiction: 'US',
    description: 'Toxic Substances Control Act + California Prop 65',
    version: '2024/01',
    rules: [
      {
        code: 'tsca-prop65-list',
        name: 'California Prop 65 List Check',
        category: 'State Regulation',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: PROP_65_CAS,
          list_name: 'California Proposition 65 List',
        },
        severity: 'warning',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Products sold in California containing Prop 65 substances require a clear and reasonable warning label.',
      },
      {
        code: 'tsca-pfas-check',
        name: 'PFAS Substance Check',
        category: 'Emerging Regulation',
        rule_type: 'property_check',
        rule_config: {
          type: 'property_check',
          property: 'is_pfas',
          expected_value: true,
        },
        severity: 'warning',
        message_template: '{status} — PFAS substances detected: {chemicals}.',
        remediation_text: 'EPA PFAS regulations are tightening. PFAS reporting under TSCA Section 8(a)(7) may be required. Several states ban PFAS in consumer products.',
      },
      {
        code: 'tsca-fda-food-contact',
        name: 'FDA 21 CFR 176.170 Food Contact Check',
        category: 'Food Contact',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: BFR_FOOD_CONTACT_RESTRICTED_CAS,
          list_name: 'FDA Food Contact Restricted Substances',
        },
        severity: 'warning',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Substances found on FDA food contact restricted list. Verify compliance with 21 CFR 176.170 and conduct migration testing if applicable.',
      },
    ],
  },

  // ─── China EPA ──────────────────────────────────────
  {
    code: 'china_epa',
    name: 'China EPA',
    jurisdiction: 'China',
    description: 'IECSC Inventory + GB 9685-2016 Standards',
    version: '2024/01',
    rules: [
      {
        code: 'china-gb9685-restricted',
        name: 'GB 9685-2016 Restricted Substances',
        category: 'Food Contact',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: [
            '80-05-7',    // BPA
            '117-81-7',   // DEHP
            '84-74-2',    // DBP
            ...PFAS_CAS,
          ],
          list_name: 'GB 9685-2016 Restricted Substances',
        },
        severity: 'warning',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Substances restricted under GB 9685-2016 for food contact materials. Verify specific migration limits (SML) apply.',
      },
      {
        code: 'china-heavy-metals',
        name: 'Heavy Metals Check (GB Standards)',
        category: 'Restriction',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: ['7439-92-1', '7440-43-9', '7439-97-6', '18540-29-9'],
          list_name: 'China Heavy Metal Restrictions',
        },
        severity: 'warning',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Heavy metals restricted under multiple GB standards. Check applicable concentration limits.',
      },
    ],
  },

  // ─── K-REACH (South Korea) ──────────────────────────
  {
    code: 'k_reach',
    name: 'K-REACH',
    jurisdiction: 'South Korea',
    description: 'Korean Registration and Evaluation of Chemicals',
    version: '2024/01',
    rules: [
      {
        code: 'kreach-pec-list',
        name: 'Priority Existing Chemicals (PEC) Check',
        category: 'Registration',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: [
            '50-00-0',    // Formaldehyde
            '7439-92-1',  // Lead
            '7440-43-9',  // Cadmium
            '71-43-2',    // Benzene
            '117-81-7',   // DEHP
            '18540-29-9', // Chromium (VI)
          ],
          list_name: 'K-REACH Priority Existing Chemicals',
        },
        severity: 'info',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Substances on the PEC list require registration under K-REACH if manufactured/imported above 1 ton/year.',
      },
      {
        code: 'kreach-cmr-check',
        name: 'CMR Substance Check',
        category: 'Authorization',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: ['71-43-2', '50-00-0', '79-06-1', '75-01-4', '106-99-0'],
          list_name: 'K-REACH CMR Substances',
        },
        severity: 'warning',
        message_template: '{status} on {list_name}.',
        remediation_text: 'CMR substances under K-REACH may require authorization for consumer uses.',
      },
    ],
  },

  // ─── DPP (EU Digital Product Passport) ──────────────
  {
    code: 'dpp',
    name: 'Digital Product Passport',
    jurisdiction: 'EU',
    description: 'EU Ecodesign for Sustainable Products Regulation - Digital Product Passport',
    version: '2024/01',
    rules: [
      {
        code: 'dpp-svhc-scip',
        name: 'SCIP Database Notification (SVHC >0.1%)',
        category: 'Disclosure',
        rule_type: 'concentration_threshold',
        rule_config: {
          type: 'concentration_threshold',
          threshold_pct: 0.1,
          operator: '>',
          applies_to: REACH_SVHC_CAS,
          list_name: 'SCIP Notification',
        },
        severity: 'fail',
        message_template: '{status}. SVHC above 0.1% requires SCIP database notification for DPP: {chemicals}.',
        remediation_text: 'Articles containing SVHC >0.1% w/w must be notified to the SCIP database under the Waste Framework Directive. This data is mandatory for the Digital Product Passport.',
      },
      {
        code: 'dpp-material-disclosure',
        name: 'Material Composition Completeness',
        category: 'Data Quality',
        rule_type: 'custom',
        rule_config: {
          type: 'custom',
          evaluator: 'material_completeness',
        },
        severity: 'info',
        message_template: 'Material composition data completeness check for DPP.',
        remediation_text: 'Digital Product Passports require complete material composition data. Ensure all chemicals have CAS numbers and concentration ranges.',
      },
    ],
  },

  // ─── BfR (Germany - Food Contact) ───────────────────
  {
    code: 'bfr',
    name: 'BfR Recommendations',
    jurisdiction: 'Germany',
    description: 'Bundesinstitut für Risikobewertung - Food Contact Material Recommendations',
    version: 'XXXVI/2024',
    rules: [
      {
        code: 'bfr-formaldehyde',
        name: 'Formaldehyde & Releasers Check',
        category: 'Migration',
        rule_type: 'custom',
        rule_config: {
          type: 'custom',
          evaluator: 'formaldehyde_releaser',
        },
        severity: 'fail',
        message_template: 'BfR Rec. XXXVI formaldehyde check: {status}.',
        remediation_text: 'BfR Recommendation XXXVI limits formaldehyde migration to 15 mg/kg in food contact materials. Test per EN 13130-1.',
      },
      {
        code: 'bfr-food-contact-restricted',
        name: 'Food Contact Restricted Substances',
        category: 'Restriction',
        rule_type: 'cas_list',
        rule_config: {
          type: 'cas_list',
          cas_numbers: BFR_FOOD_CONTACT_RESTRICTED_CAS,
          list_name: 'BfR Food Contact Restricted Substances',
        },
        severity: 'fail',
        message_template: '{status} on {list_name}.',
        remediation_text: 'Substances restricted for food contact materials under BfR Recommendations. Verify specific migration limits and conduct migration testing.',
      },
      {
        code: 'bfr-bpa-threshold',
        name: 'BPA Specific Migration Limit',
        category: 'Migration',
        rule_type: 'concentration_threshold',
        rule_config: {
          type: 'concentration_threshold',
          threshold_pct: 0.05,
          operator: '>',
          applies_to: ['80-05-7'], // BPA
          list_name: 'BPA SML',
        },
        severity: 'fail',
        message_template: '{status}. BPA exceeds BfR specific migration limit: {chemicals}.',
        remediation_text: 'BPA (Bisphenol A) migration must not exceed 0.05 mg/kg per EU Regulation 2018/213. Consider BPA-free alternatives.',
      },
    ],
  },
]

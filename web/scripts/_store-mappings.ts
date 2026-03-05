/**
 * Phase 2: Store normalization mappings directly
 *
 * Semantic matching performed by Claude (in-conversation) — no API call needed.
 * Maps 201 legacy Bubble questions → 80 canonical HQ 2.1 parameters.
 *
 * Usage: cd stacks/web && npx tsx scripts/_store-mappings.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Mapping {
  legacy_question_id: string;
  canonical_parameter_id: string | null;
  confidence: number;
  reasoning: string;
}

// ── Canonical parameter IDs by code ──
const P: Record<string, string> = {
  '2.1.1': '53c895a5-df85-4e0d-9839-b7dee32d5459',
  '2.1.2': 'fbd2d615-44ba-4ae4-b564-aaa82a85ab0b',
  '2.1.3': '0f57559f-8916-472f-92fb-2a70770820b9',
  '2.1.4': 'be8b2e9f-e464-4fe0-92f6-a38d0cdd79b9',
  '2.2.1': 'ad76f80b-b9ad-4b27-9111-262e3f1d4382',
  '2.2.2': 'b5a88657-fb04-45eb-bfc2-ae7277e82123',
  '2.2.3': '387394ff-8631-4d81-bb47-0f5c10af1440',
  '2.2.4': '692cc7a1-121a-4810-8ad9-f1d29c2ca223',
  '2.2.5': 'e4b03581-c00e-4cf0-b770-14d86fd89ca3',
  '2.3.1': 'e229743f-3a34-4030-b6ff-d6ede49fe917',
  '2.3.2': '97536175-5d9d-4443-b836-e03d5d530dd6',
  '2.3.3': 'acca9897-8c26-42b9-9b8f-e0feedc035ea',
  '2.3.4': 'bf2924ce-ac36-4be3-bdec-30a95556356c',
  '2.3.5': 'eb430651-44f0-499c-a6af-707c2cbf7211',
  '3.1.1': '3a87f4eb-fc95-47d3-b892-062b19cc421f',
  '3.1.2': 'c5f76382-18b0-42a8-9014-213e49fcdc4d',
  '3.1.3': 'e236df75-0400-47ab-b53b-4654cd3cd3b0',
  '3.1.4': 'e4cbca1c-b167-40f4-a519-33a665e80842',
  '3.1.5': '2fc05c56-64fe-49b7-b7b8-69b2ba044ae8',
  '3.1.6': '6e5ade51-ddda-4490-b4e7-774457ebf3a8',
  '3.1.7': '41e48c48-326f-4941-8f39-61a90cd21505',
  '3.1.8': 'a13fd44a-3c53-4cbc-914e-9123b0a95841',
  '3.1.9': '2b198567-cfa4-45a2-af02-b83334fa6e7c',
  '3.1.10': 'd209549f-78a1-483e-a21b-15c556fbcabd',
  '4.1.1': 'd8a8978b-968b-4906-92f1-8cd0bfb0356e',
  '4.2.1': '52aa4922-8889-4926-b095-5c71357a3974',
  '4.3.1': '45bfb0f9-433b-4d02-8068-260036757666',
  '4.3.2': '3935484e-0adf-41e3-95eb-bd9e1a8e6e62',
  '4.3.3': 'f1fc4ae2-b850-4fd8-9521-07faa222ef69',
  '4.3.4': '4d81f20b-a41e-42a4-a207-ba7f5288e384',
  '4.3.5': '4038cadf-3b98-49d9-9a4e-53b3c44b4817',
  '4.4.1': 'bc61a7db-83af-4fe3-9ec4-50684e06f101',
  '4.4.2': '4cdb8b84-9fd6-4618-a1b6-4d1e50ae58a6',
  '4.5.1': 'a10c6f57-893c-42f9-b9fa-c25f07a59bd1',
  '4.6.1': 'a2f27e30-4b30-43e7-879d-df4cb062e0ea',
  '4.7.1': '0be010ef-5eff-470f-80b6-eae04b6d7219',
  '4.8.1': '4c3c87c6-9862-4af8-b5ac-ea9d15f64aec',
  '4.9.1': '692be4cb-7ef5-4f36-9825-93cfdcc9cab3',
  '4.9.2': 'c8b7bd13-0047-4028-b083-97a364c94cec',
  '4.9.3': '91686131-4d39-4528-93d9-aeb69fd4792d',
  '4.9.4': '6fa7c19f-bc1e-4342-90bd-2ccf5bc08e4b',
  '4.9.5': 'e3d3fd96-cd55-42d8-bfc6-157079346af5',
  '4.9.6': '242951bc-54f5-4f1e-95c5-c9f827f822e4',
  '4.9.7': '1b29b7c9-2243-4cd1-b5f0-d2e5c196baf6',
  '4.9.8': '442bfacf-b1c0-47f5-8b55-f64b57e51f20',
  '4.10.1': '4e729fac-2148-4dcc-9ed1-d49d80838c2a',
  '4.10.2': '66611488-f918-40a0-9771-b5f3173d1d5f',
  '4.10.3': '931bbd45-3bff-47d6-9412-ba71321b9ddb',
  '4.10.4': '6fdad6fb-511d-4aaf-9a87-0dc67e8329da',
  '4.11.1': '537dc4aa-2d17-4dfa-8048-b2439d9b5f84',
  '4.11.2': 'e3ac084a-d767-4203-9b50-39893f1de96e',
  '4.11.3': '18d2c341-0aa0-4b39-8172-56afd906ce32',
  '4.11.4': '263d8351-b45f-494b-bf14-44b178e832c6',
  '4.11.5': '6b01d3d1-3302-4ca4-84c6-f4d61e13bafb',
  '4.11.6': 'bbafc91d-5575-4794-95cc-5ca46d507efb',
  '5.1.1': '0d5ce0ee-5ad1-48c3-8eb2-3665c1398e83',
  '5.1.2': 'd24cd533-abc3-4489-a0ea-f06b168e31a0',
  '5.1.3': 'd569c4d4-1540-46cd-b92d-026da3504380',
  '5.1.4': 'ea0138bc-c7a2-4b64-8f88-78311886116d',
  '5.1.5': '1ca515ef-53f5-4443-a71d-e9079392e084',
  '5.1.6': 'ba7bb9b8-04be-4146-824c-5bdd74509e9e',
  '5.1.7': '9d5d446c-fa0a-474f-9440-5801e6a5da4d',
  '5.1.8': '4f87136f-ec9e-4fd9-a93b-9717aa423e65',
  '5.1.9': '77ce1a9e-b65d-40dd-a473-f85d71759258',
  '5.1.10': '7f8cff22-3b2b-43f3-a713-81266d2f2c34',
  '5.1.11': 'd782984c-3b6e-4f71-8964-01aec011ba8a',
  '6.1.1': '5b2b9aed-d16f-4949-a232-d41b3fffc522',
  '6.1.2': '144d384b-4dbd-4203-a946-a70ff35b8a9a',
  '6.2.1': '8d7524f3-d6ed-49d0-92c6-ee172baf13f2',
  '6.3.1': '48dbca9e-81dc-4f55-854e-44bdeee26391',
  '6.4.1': 'f04b63da-be3d-46c5-bea2-0b76e990b5ca',
  '6.5.1': '7cb39d6f-29e5-4c14-bf07-4b3509d25abb',
  '6.5.2': '5a18e27f-1754-4b5f-bab2-4bfb05b5d530',
  '6.6.1': 'b3ce5b8e-2e5e-4177-98c2-6b64a828d0d5',
  '6.6.2': 'bb9a20fd-6529-4a37-8d37-7f571e5b2dce',
  '6.7.1': '34625afc-7434-4b7f-9891-000cfd1423e2',
  '6.8.1': 'c210d4b0-1a83-49f1-a884-9699a177d50b',
  '6.9.1': '661ea38f-2721-477d-9d1b-71c60155920b',
  '6.10.1': '9349312e-3699-4a99-9518-8d84dd8eb42c',
  '6.11.1': 'ea815e3d-1b63-49e8-9541-584d9cbaeacd',
};

const mappings: Mapping[] = [
  // ── Section 1: Product Information (no canonical match — not in HQ 2.1) ──
  { legacy_question_id: '73e96a7d-9074-4296-90b6-ceb0539c77f0', canonical_parameter_id: null, confidence: 0, reasoning: 'Product Information section not in HQ 2.1 canonical parameters' },
  { legacy_question_id: '13ac4376-35f4-4047-bb68-50be5e771b31', canonical_parameter_id: null, confidence: 0, reasoning: 'Product Code/Reference — Product Information not in HQ 2.1' },
  { legacy_question_id: '90ef0528-f74d-4f81-ba27-fb1fe4d19eed', canonical_parameter_id: null, confidence: 0, reasoning: 'Function in Application — Product Information not in HQ 2.1' },
  { legacy_question_id: 'e742a77c-86ef-49b3-9618-94a539e5b190', canonical_parameter_id: null, confidence: 0, reasoning: 'Producer — Product Information not in HQ 2.1' },
  { legacy_question_id: 'f5b2e21f-7319-4fa6-9e84-82b5d411acdf', canonical_parameter_id: null, confidence: 0, reasoning: 'Production sites — Product Information not in HQ 2.1' },
  { legacy_question_id: '38296cb2-e6f2-4540-a539-dcdcbf9469e5', canonical_parameter_id: null, confidence: 0, reasoning: 'Non-association company question — platform admin, not compliance' },
  { legacy_question_id: '1a6d9e3f-f130-4c4e-8264-545cfc273e40', canonical_parameter_id: null, confidence: 0, reasoning: 'Multiple-choice admin question — platform admin, not compliance' },
  { legacy_question_id: '71de99d8-5e99-4873-83d5-b687e4165878', canonical_parameter_id: null, confidence: 0, reasoning: 'Disclaimer field — UI element, not a compliance question' },

  // ── P&P-VIS Customer Satisfaction Survey (not compliance) ──
  { legacy_question_id: '0f5a9f22-93fc-4183-86bc-7ba570a6ba95', canonical_parameter_id: null, confidence: 0, reasoning: 'Customer satisfaction survey — not a compliance question' },
  { legacy_question_id: 'b32c45a1-3cfd-45a4-98ed-17c2fa5f0284', canonical_parameter_id: null, confidence: 0, reasoning: 'NPS/recommendation survey — not a compliance question' },
  { legacy_question_id: 'c3f04d88-7c01-43a9-a7a3-c5596fea0d80', canonical_parameter_id: null, confidence: 0, reasoning: 'Subscription renewal survey — not a compliance question' },
  { legacy_question_id: 'fe657c93-8ebc-441e-bbf7-76b1605ff84e', canonical_parameter_id: null, confidence: 0, reasoning: 'Open-ended survey feedback — not a compliance question' },
  { legacy_question_id: 'd010b86e-1a7f-40eb-9fdf-a936c50df2da', canonical_parameter_id: null, confidence: 0, reasoning: 'Survey encouragement text — static content, not a question' },
  { legacy_question_id: 'b5039dd7-46ab-4761-82ad-c4b406860b08', canonical_parameter_id: null, confidence: 0, reasoning: 'Survey encouragement text — static content, not a question' },

  // ── Orphaned PIDSL question (section "?") ──
  { legacy_question_id: '6e7a3aab-18d2-438a-9522-b5be0e3bffde', canonical_parameter_id: P['5.1.11'], confidence: 0.5, reasoning: 'General PIDSL threshold question — maps to PIDSL List parameter but different framing (below 0.1% vs exceeding declarable limit)' },

  // ── Section 2: Ecolabels ──
  { legacy_question_id: 'c2eefbab-8d9d-4a6a-b63e-452465065323', canonical_parameter_id: P['2.1.1'], confidence: 0.6, reasoning: 'EU Ecolabel 2020/1803 (printed paper, carrier bags) — successor to 2012/481/EU. Same product category, newer regulation' },
  { legacy_question_id: 'c7dc6edb-91ac-4f3f-a291-646a742404d0', canonical_parameter_id: P['2.1.3'], confidence: 0.95, reasoning: 'Exact match: Commission Decision (EU) 2019/70 ANNEX I — graphic paper' },
  { legacy_question_id: '20205775-9497-43cf-8c21-f092998823c3', canonical_parameter_id: P['2.1.4'], confidence: 0.95, reasoning: 'Exact match: Commission Decision (EU) 2019/70 ANNEX II — tissue paper' },
  { legacy_question_id: '5fb7a0b4-6181-4a29-9628-0c030c6d7fd5', canonical_parameter_id: P['2.2.1'], confidence: 0.95, reasoning: 'Exact match: Nordic Ecolabel Paper Products Chemical Module' },
  { legacy_question_id: '34531d15-bc7d-4ca9-8276-778e36ae7c88', canonical_parameter_id: P['2.2.2'], confidence: 0.95, reasoning: 'Exact match: Nordic Ecolabel Tissue Paper Supplementary Module' },
  { legacy_question_id: '1a2a64bc-054a-4764-9e5b-a199a5c6f9b0', canonical_parameter_id: P['2.2.3'], confidence: 0.95, reasoning: 'Exact match: Nordic Ecolabel Grease-proof Paper Supplementary Module' },
  { legacy_question_id: 'b95a1dda-d719-407c-9118-f2f05324c3af', canonical_parameter_id: P['2.2.4'], confidence: 0.95, reasoning: 'Exact match: Nordic Ecolabel Packaging for Liquid Foods' },
  { legacy_question_id: '25c9ef6e-f065-40c4-a8d9-54bbe6d03730', canonical_parameter_id: P['2.2.5'], confidence: 0.95, reasoning: 'Exact match: Nordic Ecolabel Disposables for Food' },
  { legacy_question_id: 'f59e6b7d-fb9c-4d99-bde4-4abb032df426', canonical_parameter_id: P['2.3.1'], confidence: 0.95, reasoning: 'Exact match: Blue Angel DE-UZ 5 Sanitary paper products' },
  { legacy_question_id: '54d5ef44-904f-46e7-8e87-871c6e917410', canonical_parameter_id: P['2.3.2'], confidence: 0.95, reasoning: 'Exact match: Blue Angel DE-UZ 14a Recycled paper' },
  { legacy_question_id: '5f0726f0-4fb4-4106-848c-d53a7e525b51', canonical_parameter_id: P['2.3.3'], confidence: 0.95, reasoning: 'Exact match: Blue Angel DE-UZ 14b Finished products from recovered paper' },
  { legacy_question_id: 'c4091d45-de4b-4ed9-8dcb-39f2147852ee', canonical_parameter_id: P['2.3.4'], confidence: 0.95, reasoning: 'Exact match: Blue Angel DE-UZ 56 Recycled cardboard' },
  { legacy_question_id: 'de58ea93-de7e-4bfb-8684-49f16b0910e7', canonical_parameter_id: P['2.3.5'], confidence: 0.95, reasoning: 'Exact match: Blue Angel DE-UZ 72 Printing and publication papers' },
  { legacy_question_id: 'c88a3e15-12cf-4cee-8eda-2040b38cd5cf', canonical_parameter_id: null, confidence: 0, reasoning: 'Blue Angel DE-UZ 217a — not in HQ 2.1 (only DE-UZ 5, 14a, 14b, 56, 72 included)' },
  { legacy_question_id: '96e17b1d-bb43-497e-99e3-feaf1c8feb67', canonical_parameter_id: null, confidence: 0, reasoning: 'Blue Angel DE-UZ 217b — not in HQ 2.1 (only DE-UZ 5, 14a, 14b, 56, 72 included)' },

  // ── Section 3: Biocides ──
  { legacy_question_id: '79dc438f-fbb6-432e-b64b-a7097cd61b9f', canonical_parameter_id: P['3.1.1'], confidence: 0.95, reasoning: 'Exact match: Regulation (EU) 528/2012 biocidal active substances' },
  { legacy_question_id: '6ba260e3-6dfb-47fd-8675-85356c56088b', canonical_parameter_id: P['3.1.1'], confidence: 0.75, reasoning: 'Detail/follow-up for biocides question — canonical 3.1.1 uses with_detail_table pattern' },
  { legacy_question_id: '59f10cb3-dbe3-48df-bccf-dc45078ee8c7', canonical_parameter_id: P['3.1.3'], confidence: 0.95, reasoning: 'Exact match: Article 95 list under PT 6' },
  { legacy_question_id: '1d91efe4-e89c-4c41-846f-75ca30943177', canonical_parameter_id: P['3.1.4'], confidence: 0.95, reasoning: 'Exact match: EU supplier listed in Article 95 for PT 6' },
  { legacy_question_id: '7b4e26f6-cd15-4217-b9ca-4a7e3290998a', canonical_parameter_id: P['3.1.5'], confidence: 0.95, reasoning: 'Exact match: Biocidal active substances used as slimicides (PT 12)' },
  { legacy_question_id: '2d332233-c8a8-4769-8f00-6840e50abf12', canonical_parameter_id: P['3.1.7'], confidence: 0.95, reasoning: 'EU supplier Article 95 — follows PT 12 context, maps to canonical 3.1.7 (EU supplier for PT 12)' },
  { legacy_question_id: 'dfcf48c2-3626-4368-85ae-6d02232778d6', canonical_parameter_id: P['3.1.8'], confidence: 0.95, reasoning: 'Exact match: Preservatives for liquid-cooling and processing systems (PT 11)' },
  { legacy_question_id: '73b56921-4fa9-4655-bcfd-971ee6e53707', canonical_parameter_id: P['3.1.10'], confidence: 0.95, reasoning: 'EU supplier Article 95 — follows PT 11 context, maps to canonical 3.1.10 (EU supplier for PT 11)' },

  // ── Section 4: Food Contact ──
  { legacy_question_id: 'bf4bad40-d44a-49c4-9891-855c99937265', canonical_parameter_id: P['4.1.1'], confidence: 0.95, reasoning: 'Exact match: Can product be used for food contact articles from paper/paperboard' },
  { legacy_question_id: '466900f0-f7fc-4b95-b8b3-22ad8ad6391d', canonical_parameter_id: P['4.1.1'], confidence: 0.6, reasoning: 'General limitations follow-up — related to food contact general but no separate canonical parameter' },
  { legacy_question_id: 'ac83b165-a67c-4a9e-8811-1314bbb1b446', canonical_parameter_id: P['4.2.1'], confidence: 0.95, reasoning: 'Exact match: Framework Regulation (EC) No 1935/2004 articles 3 and 17' },

  // Germany BfR
  { legacy_question_id: '49169de7-593a-4ce0-b096-c6f3d0bcf66e', canonical_parameter_id: P['4.3.1'], confidence: 0.95, reasoning: 'Exact match: BfR recommendation XIV Polymer Dispersions' },
  { legacy_question_id: '39ca7781-7886-4fb2-ab73-c9c8f44ab647', canonical_parameter_id: P['4.3.1'], confidence: 0.75, reasoning: 'Detail table for BfR XIV — canonical 4.3.1 uses with_detail_table' },
  { legacy_question_id: '87db1708-5add-473a-a52a-6dbb2073f17b', canonical_parameter_id: P['4.3.2'], confidence: 0.95, reasoning: 'Exact match: BfR recommendation XXXVI Paper and Board' },
  { legacy_question_id: 'ccd80e90-464e-4f76-a19c-e4dac087e3f0', canonical_parameter_id: P['4.3.2'], confidence: 0.75, reasoning: 'Detail table for BfR XXXVI' },
  { legacy_question_id: 'bd8c6d60-1cb5-411b-bee6-264f1dde9221', canonical_parameter_id: P['4.3.3'], confidence: 0.95, reasoning: 'Exact match: BfR recommendation XXXVI/1 Cooking Papers' },
  { legacy_question_id: 'd5b0561d-64bf-4fa3-a5b7-b1f459861142', canonical_parameter_id: P['4.3.3'], confidence: 0.75, reasoning: 'Detail table for BfR XXXVI/1' },
  { legacy_question_id: '3b2167ea-fe3d-4743-a440-e1bf05381f53', canonical_parameter_id: P['4.3.4'], confidence: 0.95, reasoning: 'Exact match: BfR recommendation XXXVI/2 Baking Purposes' },
  { legacy_question_id: '8d7f1f4b-278c-4047-8f9c-3f8bfab4c10e', canonical_parameter_id: P['4.3.4'], confidence: 0.75, reasoning: 'Detail table for BfR XXXVI/2' },
  { legacy_question_id: 'fc26fe6f-fd26-420a-a642-cf340cac6dc7', canonical_parameter_id: P['4.3.5'], confidence: 0.95, reasoning: 'Exact match: BfR recommendation XXXVI/3 Absorber pads' },
  { legacy_question_id: '080248a3-c616-404e-a9c1-486c69390778', canonical_parameter_id: P['4.3.5'], confidence: 0.75, reasoning: 'Detail table for BfR XXXVI/3' },
  { legacy_question_id: '3796bad9-5177-486e-8261-17ff10dbf268', canonical_parameter_id: null, confidence: 0, reasoning: 'Other BfR recommendations — catch-all not in HQ 2.1 (only XIV, XXXVI, XXXVI/1-3 are canonical)' },

  // Netherlands
  { legacy_question_id: '353cd2e2-e199-4f95-be7b-312f65ab02c3', canonical_parameter_id: P['4.4.1'], confidence: 0.95, reasoning: 'Exact match: Warenwetregeling Hoofdstuk II Paper and Paperboard' },
  { legacy_question_id: '006cb760-7e6c-4234-9b2f-abd3a9831c67', canonical_parameter_id: P['4.4.1'], confidence: 0.75, reasoning: 'Detail table for Netherlands Hoof II' },
  { legacy_question_id: '76f292c5-3e2a-41b2-8d41-95fa4eacdcd9', canonical_parameter_id: P['4.4.2'], confidence: 0.95, reasoning: 'Exact match: Warenwetregeling Hoofdstuk X Coatings' },
  { legacy_question_id: 'f6e4c711-e522-4d29-81e7-8e72cd9d98a7', canonical_parameter_id: P['4.4.2'], confidence: 0.75, reasoning: 'Detail table for Netherlands Hoof X' },

  // Switzerland
  { legacy_question_id: '85c1f337-120f-4b0b-9722-918be9d7d64a', canonical_parameter_id: P['4.5.1'], confidence: 0.95, reasoning: 'Exact match: SR 817.023.21 printing inks' },
  { legacy_question_id: '073ef63f-5313-433e-9a43-bfe3b3bfef17', canonical_parameter_id: P['4.5.1'], confidence: 0.75, reasoning: 'Detail table for Switzerland' },

  // Italy
  { legacy_question_id: '6828cad3-24f3-4be4-8e50-548d9c073f67', canonical_parameter_id: P['4.6.1'], confidence: 0.95, reasoning: 'Exact match: Italian Ministerial Decree 21 March 1973' },
  { legacy_question_id: '1b4b24ea-87f1-4faf-b984-d7c641157862', canonical_parameter_id: P['4.6.1'], confidence: 0.75, reasoning: 'Detail table for Italy' },

  // France
  { legacy_question_id: 'f11a4307-1f74-43d3-9033-84a8249b96e5', canonical_parameter_id: P['4.7.1'], confidence: 0.95, reasoning: 'Exact match: French Decree 2008/1469' },
  { legacy_question_id: 'b1bd93bd-5a56-44e4-8ad7-143bd4ecb964', canonical_parameter_id: P['4.7.1'], confidence: 0.75, reasoning: 'Detail table for France Decree 2008/1469' },
  { legacy_question_id: '084b119d-12c0-4aff-82c7-38ce9203dc2a', canonical_parameter_id: P['4.7.1'], confidence: 0.5, reasoning: 'DGCCRF Fiche Papiers et Cartons 2019 — separate French regulation, no dedicated canonical parameter. Closest is 4.7.1' },
  { legacy_question_id: '8fa6e772-5404-4f67-9a08-927251470bee', canonical_parameter_id: P['4.7.1'], confidence: 0.4, reasoning: 'Detail for DGCCRF — weakly maps to France canonical parameter' },

  // Other European
  { legacy_question_id: 'c63ed42f-d271-42a0-9b76-f36ce0f25c7d', canonical_parameter_id: null, confidence: 0, reasoning: 'Other relevant national legislations in Europe — generic catch-all, no canonical match' },

  // EU Plastics & Dual Use
  { legacy_question_id: '07127a50-42e6-4203-9ee8-dc0fb9c81750', canonical_parameter_id: P['4.8.1'], confidence: 0.95, reasoning: 'Exact match: EU Regulation on plastics (EU) 10/2011' },
  { legacy_question_id: '08f30c0c-52ab-4343-a4fe-b2ba5e17fc79', canonical_parameter_id: P['4.8.1'], confidence: 0.75, reasoning: 'Detail table for EU Plastics 10/2011' },
  { legacy_question_id: '8cccd5ed-0393-436d-873a-538292aa543b', canonical_parameter_id: P['4.8.1'], confidence: 0.4, reasoning: 'Food additives (EC 1333/2008) and flavourings (EC 1334/2008) — different regulations but same subsection context (EU Plastics & Dual Use)' },
  { legacy_question_id: '150eeaa8-edbb-4984-8962-ccd70d7befd3', canonical_parameter_id: P['4.8.1'], confidence: 0.35, reasoning: 'Detail for food additives/flavourings — weak match to EU Plastics parameter' },

  // USA
  { legacy_question_id: 'fd71d475-aea8-4ebd-b0a3-ee418afd6338', canonical_parameter_id: P['4.9.1'], confidence: 0.95, reasoning: 'Exact match: 21 CFR § 176.170 aqueous and fatty foods' },
  { legacy_question_id: '23776426-ae2a-4642-9ec2-9c5e28edb0e4', canonical_parameter_id: P['4.9.1'], confidence: 0.75, reasoning: 'Detail table for 21 CFR 176.170' },
  { legacy_question_id: 'd9aeb851-426c-4671-ad33-2473265ee68a', canonical_parameter_id: P['4.9.2'], confidence: 0.95, reasoning: 'Exact match: 21 CFR § 176.180 dry foods' },
  { legacy_question_id: '8d141c79-816a-4b5d-8894-56085d93efd9', canonical_parameter_id: P['4.9.2'], confidence: 0.75, reasoning: 'Detail table for 21 CFR 176.180' },
  { legacy_question_id: 'c12489ba-a7d8-4421-9f53-40a830a00e90', canonical_parameter_id: P['4.9.3'], confidence: 0.95, reasoning: 'Exact match: 21 CFR § 175.105 Adhesives' },
  { legacy_question_id: '09530b6e-6b15-4e1e-92b4-22303cdf1c66', canonical_parameter_id: P['4.9.3'], confidence: 0.75, reasoning: 'Detail table for 21 CFR 175.105' },
  { legacy_question_id: '6d857018-f523-477a-9014-db88bb2777b2', canonical_parameter_id: P['4.9.4'], confidence: 0.95, reasoning: 'Exact match: 21 CFR § 175.300 Resinous and polymeric coatings' },
  { legacy_question_id: 'c34a0eb4-99a9-4885-acd7-5c8a8dd84efc', canonical_parameter_id: P['4.9.4'], confidence: 0.75, reasoning: 'Detail table for 21 CFR 175.300' },
  { legacy_question_id: '523cf3d8-9471-48f0-aea7-0ef4c3de7b08', canonical_parameter_id: P['4.9.5'], confidence: 0.95, reasoning: 'Exact match: 21 CFR § 176.300 Slimicides' },
  { legacy_question_id: 'a8439b37-d492-4625-85d7-63e4c30e0c2c', canonical_parameter_id: P['4.9.5'], confidence: 0.75, reasoning: 'Detail table for 21 CFR 176.300' },
  { legacy_question_id: '2c37b32d-22c3-436d-922e-0398ccc8b851', canonical_parameter_id: P['4.9.6'], confidence: 0.95, reasoning: 'Exact match: 21 CFR § 176.200 Defoaming agents in coatings' },
  { legacy_question_id: 'c40cd2e8-ac57-4f53-b6f2-227da7d3e2de', canonical_parameter_id: P['4.9.6'], confidence: 0.75, reasoning: 'Detail table for 21 CFR 176.200' },
  { legacy_question_id: '18adf139-3891-4a48-9a16-8ba495147c0f', canonical_parameter_id: P['4.9.7'], confidence: 0.95, reasoning: 'Exact match: 21 CFR § 176.210 Defoaming agents in paper manufacture' },
  { legacy_question_id: 'fa7bced3-a908-4702-9a58-d2e12dad7b68', canonical_parameter_id: P['4.9.7'], confidence: 0.75, reasoning: 'Detail table for 21 CFR 176.210' },
  { legacy_question_id: 'a494e521-15d4-4018-a89d-706834085814', canonical_parameter_id: P['4.9.8'], confidence: 0.95, reasoning: 'Exact match: Food Contact Notification (FCN)' },
  { legacy_question_id: 'ca09a67b-cf36-46e3-9d48-c29e1a5fd5ba', canonical_parameter_id: P['4.9.8'], confidence: 0.75, reasoning: 'Detail table for FCN' },
  { legacy_question_id: 'fbe658d1-5eb0-402e-ae89-9d107dcae188', canonical_parameter_id: null, confidence: 0, reasoning: 'Other 21 CFR chapters — generic catch-all, no specific canonical parameter' },

  // China
  { legacy_question_id: '67ee96ea-b33f-4208-ae55-386ca7080718', canonical_parameter_id: P['4.10.1'], confidence: 0.95, reasoning: 'Exact match: GB 4806.1-2016 General safety requirements' },
  { legacy_question_id: '4a0c1c02-87e0-4177-adab-af071208e1a8', canonical_parameter_id: P['4.10.2'], confidence: 0.95, reasoning: 'Exact match: GB4806.8-2016 Papers/Paperboard for Food Contact' },
  { legacy_question_id: '7f618779-daca-4818-98e6-bcb7e3a4017d', canonical_parameter_id: P['4.10.3'], confidence: 0.95, reasoning: 'Exact match: GB9685-2016 Additives in Food Contact Materials' },
  { legacy_question_id: '462f1213-b2f3-4c62-a510-b1aaa32a5fc8', canonical_parameter_id: P['4.10.3'], confidence: 0.75, reasoning: 'Detail table for GB9685' },
  { legacy_question_id: 'd5b883ae-d257-4f70-b6dc-375327577035', canonical_parameter_id: P['4.10.4'], confidence: 0.95, reasoning: 'Exact match: Other Standard (GB) for resin' },
  { legacy_question_id: '65df3f99-e9fd-4122-b040-2c74cc9e32f0', canonical_parameter_id: P['4.10.4'], confidence: 0.75, reasoning: 'Detail table for Other GB Standard' },

  // South America / MERCOSUR
  { legacy_question_id: '00c7c0ee-0dac-4f03-b0c2-d0662ffa933e', canonical_parameter_id: P['4.11.1'], confidence: 0.95, reasoning: 'Exact match: MERCOSUR GMC Res. No. 03/92' },
  { legacy_question_id: 'b5adc0b1-0391-4093-89f4-81224ec825a7', canonical_parameter_id: P['4.11.2'], confidence: 0.95, reasoning: 'Exact match: MERCOSUR GMC Res. No. 39/19 additives for plastics' },
  { legacy_question_id: '920c8b14-aa85-4aea-9933-95083844914b', canonical_parameter_id: P['4.11.2'], confidence: 0.75, reasoning: 'Detail table for MERCOSUR 39/19' },
  { legacy_question_id: '11df92fb-8258-4750-90f6-93e48188b730', canonical_parameter_id: P['4.11.3'], confidence: 0.95, reasoning: 'Exact match: MERCOSUR GMC Res. No. 40/15 cellulosic equipment' },
  { legacy_question_id: '3df1577c-5cea-4a73-bd4d-ac5f0aaa971e', canonical_parameter_id: P['4.11.3'], confidence: 0.4, reasoning: 'Third-party lab verification for MERCOSUR — procedural, not regulatory substance. Loosely maps to 40/15' },
  { legacy_question_id: 'de37d78f-6db7-45b2-aa4c-4404b9caccf7', canonical_parameter_id: P['4.11.3'], confidence: 0.4, reasoning: 'Duplicate: Third-party lab verification for MERCOSUR' },
  { legacy_question_id: 'fb0a5888-779b-4fc4-b6b3-58b1367f55b0', canonical_parameter_id: P['4.11.3'], confidence: 0.75, reasoning: 'Detail table for MERCOSUR 40/15' },
  { legacy_question_id: 'dbee061a-8c4a-4ebb-9843-869903c32df4', canonical_parameter_id: P['4.11.3'], confidence: 0.5, reasoning: 'Chemical substances chapter/article number — supplementary to MERCOSUR 40/15' },
  { legacy_question_id: '2b87aac8-d204-4e46-b05a-4ad929f9d9f3', canonical_parameter_id: P['4.11.3'], confidence: 0.5, reasoning: 'Chemical substances Resolution/chapter number — supplementary to MERCOSUR 40/15' },
  { legacy_question_id: '1ba79948-0dec-45cd-b009-98c4de09fabe', canonical_parameter_id: P['4.11.3'], confidence: 0.7, reasoning: 'All chemical substances in positive list of 40/15 — directly about MERCOSUR 40/15 compliance' },
  { legacy_question_id: '2a1fab04-5ec0-4a19-948a-7edfed090c29', canonical_parameter_id: P['4.11.3'], confidence: 0.7, reasoning: 'Expanded version: all chemical substances in 40/15 or other Resolutions' },
  { legacy_question_id: '71152eba-f738-4b50-8fc4-78bb1724bae8', canonical_parameter_id: P['4.11.4'], confidence: 0.95, reasoning: 'Exact match: MERCOSUR GMC Res. No. 41/15 hot cooking and filtration' },
  { legacy_question_id: 'f547d63c-97e9-4ff1-809e-cc621f1b6d20', canonical_parameter_id: P['4.11.4'], confidence: 0.75, reasoning: 'Detail table for MERCOSUR 41/15' },
  { legacy_question_id: '9344bd5f-171e-4806-a999-56c8548c278c', canonical_parameter_id: P['4.11.5'], confidence: 0.95, reasoning: 'Exact match: MERCOSUR GMC Res. No. 42/15 cooking/heating in oven' },
  { legacy_question_id: '8f657b22-ca41-4651-8bc6-34d50409952f', canonical_parameter_id: P['4.11.5'], confidence: 0.75, reasoning: 'Detail table for MERCOSUR 42/15' },
  { legacy_question_id: 'dae03351-83f6-406d-a5c0-14c0755df605', canonical_parameter_id: P['4.11.6'], confidence: 0.95, reasoning: 'Exact match: MERCOSUR GMC Res. No. 02/12 monomers/polymers' },
  { legacy_question_id: '51a8aa66-75ec-46b6-9571-86172cb5b4ef', canonical_parameter_id: P['4.11.6'], confidence: 0.75, reasoning: 'Detail table for MERCOSUR 02/12' },

  // Japan (not in HQ 2.1)
  { legacy_question_id: '7c6d0261-eff6-4415-8987-753862cbd158', canonical_parameter_id: null, confidence: 0, reasoning: 'Japan Food Sanitation Act — Japan not included in HQ 2.1 canonical parameters' },
  { legacy_question_id: 'd79836bf-50c1-4325-860c-17aa1a2d4b57', canonical_parameter_id: null, confidence: 0, reasoning: 'Japan Appended Table 1-2 — Japan not in HQ 2.1' },
  { legacy_question_id: '0b72b11e-1aac-4641-a50c-afb3e2b4880c', canonical_parameter_id: null, confidence: 0, reasoning: 'Japan Appended Table 1-1 — Japan not in HQ 2.1' },

  // ── Section 5: PIDSL ──
  { legacy_question_id: 'de8c706a-04ec-45e9-8907-2f3ca0ac3a43', canonical_parameter_id: P['5.1.1'], confidence: 0.95, reasoning: 'Exact match: CMR substances per CLP Regulation (EC) 1272/2008' },
  { legacy_question_id: '16504b37-795d-44d3-a561-e6b8c7aac7c0', canonical_parameter_id: P['5.1.1'], confidence: 0.75, reasoning: 'Detail table for CMR — canonical 5.1.1 uses with_detail_table' },
  { legacy_question_id: 'f69db08a-5434-4c14-bd07-a750fb3b6eca', canonical_parameter_id: P['5.1.2'], confidence: 0.95, reasoning: 'Exact match: SVHC Candidate List Article 59' },
  { legacy_question_id: '2e99573b-930d-487a-81a9-7f1714b8d2eb', canonical_parameter_id: P['5.1.2'], confidence: 0.75, reasoning: 'Detail table for SVHC' },
  { legacy_question_id: '3a2359ad-e918-417a-ba99-fdeb24ccdcb0', canonical_parameter_id: P['5.1.3'], confidence: 0.95, reasoning: 'Exact match: Annex XIV REACH Authorisation' },
  { legacy_question_id: 'acc714c6-dd2f-42cb-a66d-22bb1e981838', canonical_parameter_id: P['5.1.3'], confidence: 0.75, reasoning: 'Detail table for Annex XIV' },
  { legacy_question_id: '8a19fcae-f5f8-4781-b95b-7ecbaeaa3370', canonical_parameter_id: P['5.1.4'], confidence: 0.95, reasoning: 'Exact match: Annex XVII REACH Restrictions' },
  { legacy_question_id: '0a62d06f-1fb7-467b-8de5-331caada3dd9', canonical_parameter_id: P['5.1.4'], confidence: 0.75, reasoning: 'Detail table for Annex XVII' },
  { legacy_question_id: 'dc1d1729-94b2-4c30-bf4a-d92205d55a7e', canonical_parameter_id: null, confidence: 0, reasoning: 'Endocrine Disrupting properties — not a separate parameter in HQ 2.1' },
  { legacy_question_id: 'cab54591-fb59-4669-850f-d2e20808a23d', canonical_parameter_id: null, confidence: 0, reasoning: 'Detail for Endocrine Disrupting — parent not in HQ 2.1' },
  { legacy_question_id: '82ae3b9f-665f-4287-a500-e903cefad14a', canonical_parameter_id: P['5.1.6'], confidence: 0.95, reasoning: 'Exact match: Water Framework Directive 2000/60/EC' },
  { legacy_question_id: '97d2a85f-d99c-483b-9f88-2dc7e0b7c972', canonical_parameter_id: P['5.1.6'], confidence: 0.75, reasoning: 'Detail table for Water Framework Directive' },
  { legacy_question_id: 'b063ca55-9337-4c3c-9822-076b0541fe0d', canonical_parameter_id: P['5.1.7'], confidence: 0.95, reasoning: 'Exact match: Persistent organic pollutants (POP)' },
  { legacy_question_id: '133ae6fa-8ff5-4ccb-9a8b-e1dc31defa5b', canonical_parameter_id: P['5.1.7'], confidence: 0.75, reasoning: 'Detail table for POP' },
  { legacy_question_id: 'c4464510-21b4-4e6d-ab84-9ca0c844125d', canonical_parameter_id: null, confidence: 0, reasoning: 'Synthetic polymer microparticles (SPM) — not in HQ 2.1 canonical parameters' },
  { legacy_question_id: '6c7f42de-f7e6-44b0-b5f4-03b4c99d20a5', canonical_parameter_id: null, confidence: 0, reasoning: 'SPM specifics — parent not in HQ 2.1' },
  { legacy_question_id: '83f41b2e-3074-4aa0-806b-0ae3e91b0ca8', canonical_parameter_id: null, confidence: 0, reasoning: 'Polymers excluded from SPM — SPM not in HQ 2.1' },
  { legacy_question_id: 'b288f0a6-d6b8-4b72-ad4e-c122e2649e41', canonical_parameter_id: null, confidence: 0, reasoning: 'SPM list of exemptions — SPM not in HQ 2.1' },
  { legacy_question_id: 'e5693181-7cfd-4e37-9cce-93c2b2377d35', canonical_parameter_id: P['5.1.8'], confidence: 0.95, reasoning: 'Exact match: Heavy metals CONEG / Directive 94/62/EC' },
  { legacy_question_id: 'cfd9e24f-924a-4846-abbb-81b7dd6385ec', canonical_parameter_id: P['5.1.8'], confidence: 0.75, reasoning: 'Detail table for CONEG' },
  { legacy_question_id: '04f50090-1f4d-43ff-a504-37979ed2e5e8', canonical_parameter_id: P['5.1.9'], confidence: 0.95, reasoning: 'Exact match: EN 71-3 and EN 71-9 toy safety' },
  { legacy_question_id: '5b7500bb-177f-4f0d-8238-fa84c4359579', canonical_parameter_id: P['5.1.9'], confidence: 0.75, reasoning: 'Detail table for EN 71' },
  { legacy_question_id: '14cc42ef-cfd0-45f7-859b-b600d8d356fa', canonical_parameter_id: P['5.1.10'], confidence: 0.95, reasoning: 'Exact match: California Proposition 65' },
  { legacy_question_id: 'dc6f92cd-9d6e-4b89-87c5-8bd4e056b012', canonical_parameter_id: P['5.1.10'], confidence: 0.75, reasoning: 'Detail table for Prop 65' },
  { legacy_question_id: 'a20e84f3-13a7-4c47-8846-fbef87d584ec', canonical_parameter_id: null, confidence: 0, reasoning: 'PFAS — not a separate parameter in HQ 2.1 canonical parameters' },
  { legacy_question_id: 'bea889d8-f1b1-4d7c-a1a8-f73f7a99673d', canonical_parameter_id: null, confidence: 0, reasoning: 'Detail for PFAS — parent not in HQ 2.1' },
  { legacy_question_id: 'cb5d256c-1689-4ea8-8ad1-d7f802130018', canonical_parameter_id: P['5.1.11'], confidence: 0.95, reasoning: 'Exact match: PIDSL List substances exceeding declarable limit' },
  { legacy_question_id: 'e707c362-6e95-439f-b261-dd70420d54ba', canonical_parameter_id: P['5.1.11'], confidence: 0.75, reasoning: 'Detail table for PIDSL List' },
  { legacy_question_id: 'aa7b1944-7609-4fdb-b0a2-f8c69baf58b8', canonical_parameter_id: null, confidence: 0, reasoning: 'Truncated/broken question ("If yes, please provide details of the identi") — data artifact' },
  { legacy_question_id: 'adc94412-0058-4a31-acec-c1185f47ae1f', canonical_parameter_id: P['5.1.5'], confidence: 0.75, reasoning: 'Detail table for CoRAP — maps to canonical 5.1.5' },
  { legacy_question_id: '002d2564-f9fa-4c80-a734-ec0a5b9dba4b', canonical_parameter_id: null, confidence: 0, reasoning: 'UI instruction to open PIDSL table — not a compliance question' },
  { legacy_question_id: 'd4829ebc-bd30-4cec-8c10-dad0d785a784', canonical_parameter_id: P['5.1.10'], confidence: 0.85, reasoning: 'Duplicate: California Proposition 65 (same as 5.1.23 but different legacy question number)' },
  { legacy_question_id: 'e3eb7872-f202-41d9-a102-bdbd55cb94cd', canonical_parameter_id: P['5.1.5'], confidence: 0.95, reasoning: 'Exact match: CoRAP Community rolling action plan' },

  // ── Section 6: Additional Requirements ──
  { legacy_question_id: '713d6e56-8d0e-422c-bd8d-58ccef9f97c6', canonical_parameter_id: P['6.1.1'], confidence: 0.95, reasoning: 'Exact match: Kosher certification' },
  { legacy_question_id: '85d6ee19-1923-4945-ad5b-69d0bd9d5975', canonical_parameter_id: P['6.1.1'], confidence: 0.75, reasoning: 'Certificate attachment for Kosher' },
  { legacy_question_id: '2d6f1126-b3a9-4e1d-abe1-db8ff0068373', canonical_parameter_id: P['6.1.2'], confidence: 0.95, reasoning: 'Exact match: Halal certification' },
  { legacy_question_id: '35b03916-101c-4653-b2cd-094b1b6dc067', canonical_parameter_id: P['6.1.2'], confidence: 0.75, reasoning: 'Certificate attachment for Halal' },
  { legacy_question_id: '4e7c381b-aef5-43d5-91fe-f32127eced32', canonical_parameter_id: P['6.2.1'], confidence: 0.95, reasoning: 'Exact match: Passover prohibited substances (chametz/kitniyot)' },
  { legacy_question_id: 'f8827fa9-2e90-434b-abc8-4c92d2f368c9', canonical_parameter_id: P['6.2.1'], confidence: 0.75, reasoning: 'Detail table for Passover substances' },
  { legacy_question_id: '915647fc-55f0-451b-b18e-4f373f8e58a2', canonical_parameter_id: P['6.3.1'], confidence: 0.95, reasoning: 'Exact match: Animal origin substances' },
  { legacy_question_id: '87e06592-83b9-4c08-b3f6-c963d7adb134', canonical_parameter_id: P['6.3.1'], confidence: 0.75, reasoning: 'Detail table for animal origin' },
  { legacy_question_id: 'b5e9dcb3-5c76-4bc8-9e0f-bead9afb1386', canonical_parameter_id: P['6.4.1'], confidence: 0.95, reasoning: 'Exact match: BSE/TSE risk material' },
  { legacy_question_id: 'f0c03e1f-7b06-4db3-aa7d-67fc7a916956', canonical_parameter_id: P['6.5.1'], confidence: 0.95, reasoning: 'Exact match: Ethanol intentionally added' },
  { legacy_question_id: 'ece6faff-e3eb-459b-a6ca-1ccfa0ad5a48', canonical_parameter_id: P['6.5.2'], confidence: 0.95, reasoning: 'Exact match: Ethanol derived from plant source' },
  { legacy_question_id: '415e927b-4def-4520-972b-e16e545e3c52', canonical_parameter_id: P['6.6.1'], confidence: 0.95, reasoning: 'Exact match: EU food allergens Regulation (EU) 1169/2011' },
  { legacy_question_id: '9d741d26-f2b4-49bc-bb1a-2430e028692b', canonical_parameter_id: P['6.6.1'], confidence: 0.75, reasoning: 'Detail table for EU allergens' },
  { legacy_question_id: '29959184-c072-4367-a86f-ca209a13f051', canonical_parameter_id: P['6.6.2'], confidence: 0.95, reasoning: 'Exact match: US Food Allergen Labeling Act 2004' },
  { legacy_question_id: '4acfc59e-2b78-4869-b656-83d70b811e34', canonical_parameter_id: P['6.6.2'], confidence: 0.75, reasoning: 'Detail table for US allergens' },
  { legacy_question_id: '369dc117-d7f0-4d37-bf64-a1de44850dac', canonical_parameter_id: P['6.7.1'], confidence: 0.95, reasoning: 'Exact match: Nanomaterials EC Recommendation 2011/696/EU' },
  { legacy_question_id: 'db9c35fb-daf2-42f0-808d-a95079e4ab0e', canonical_parameter_id: P['6.7.1'], confidence: 0.75, reasoning: 'Detail table for nanomaterials' },
  { legacy_question_id: '88327abd-4a11-422e-bb95-c1311e7a846d', canonical_parameter_id: P['6.8.1'], confidence: 0.95, reasoning: 'Exact match: GMO Regulation (EU) 1829/2003' },
  { legacy_question_id: '3b120f03-70f5-434e-a576-6e1a5e2b4326', canonical_parameter_id: P['6.8.1'], confidence: 0.75, reasoning: 'Detail table for GMO' },
  { legacy_question_id: 'f87aafab-316b-4280-8231-2efbc50691d0', canonical_parameter_id: P['6.9.1'], confidence: 0.95, reasoning: 'Exact match: Mineral Oil Hydrocarbons (MOH)' },
  { legacy_question_id: 'f05a2d21-c33a-41c3-91d3-7b307c516e9d', canonical_parameter_id: P['6.9.1'], confidence: 0.75, reasoning: 'Detail: MOH type and grade specification' },
  { legacy_question_id: '3702e651-7bdb-4b27-b5d2-9dc6a7b0ffce', canonical_parameter_id: P['6.9.1'], confidence: 0.7, reasoning: 'Detail: MOAH/PAH content — secondary detail for mineral oil' },
  { legacy_question_id: '84da7a05-b64e-4e5f-a8a8-88d1d40579df', canonical_parameter_id: P['6.10.1'], confidence: 0.95, reasoning: 'Exact match: Conflict minerals Dodd-Frank / EU 2017/821' },
  { legacy_question_id: '0ba28d43-e29f-402e-87f7-5d9dd3b09aa5', canonical_parameter_id: P['6.10.1'], confidence: 0.75, reasoning: 'Detail table for conflict minerals' },
  { legacy_question_id: '43330b25-5172-4dbc-bed4-d2bab6ed62ab', canonical_parameter_id: P['6.11.1'], confidence: 0.95, reasoning: 'Exact match: Palm Oil / Palm Kernel Oil' },

  // ── Section 7: Supplementary Materials (not compliance) ──
  { legacy_question_id: 'f14ba018-f980-4be3-95a5-6724d4563504', canonical_parameter_id: null, confidence: 0, reasoning: 'Document upload prompt — UI element, not a compliance question' },
  { legacy_question_id: '69599d47-aa61-41bc-a09b-3af467443460', canonical_parameter_id: null, confidence: 0, reasoning: 'Document upload prompt variant — UI element, not a compliance question' },

  // ── Section 10: EU Digital Product Passport (not in HQ 2.1) ──
  { legacy_question_id: '5f0d98e0-7229-465b-b437-91396d3e1c68', canonical_parameter_id: null, confidence: 0, reasoning: 'DPP unique identifier — EU Digital Product Passport not in HQ 2.1' },
  { legacy_question_id: 'b984f609-b660-46a1-bd00-af37eacf9e2c', canonical_parameter_id: null, confidence: 0, reasoning: 'DPP identifier detail — DPP not in HQ 2.1' },
  { legacy_question_id: '9fcc099f-f46b-4cd0-9e92-da3b00f5a7dc', canonical_parameter_id: null, confidence: 0, reasoning: 'DPP carbon footprint — DPP not in HQ 2.1' },
  { legacy_question_id: 'ec153541-3906-428f-ad44-693535452c7d', canonical_parameter_id: null, confidence: 0, reasoning: 'DPP recycled content — DPP not in HQ 2.1' },
  { legacy_question_id: 'fce0ab2e-5a7b-4016-9c6c-4715aa25999c', canonical_parameter_id: null, confidence: 0, reasoning: 'DPP recyclability — DPP not in HQ 2.1' },
  { legacy_question_id: 'f989c737-4600-43fc-a365-aaa032dc03d3', canonical_parameter_id: null, confidence: 0, reasoning: 'DPP disposal method — DPP not in HQ 2.1' },
  { legacy_question_id: '29cdcfd5-bf2f-49bf-8174-4d7f059e5712', canonical_parameter_id: null, confidence: 0, reasoning: 'DPP traceability — DPP not in HQ 2.1' },
  { legacy_question_id: '8af011ae-c136-4c02-bc4f-530ff9118710', canonical_parameter_id: P['5.1.2'], confidence: 0.5, reasoning: 'DPP SVHC question — semantically matches PIDSL 5.1.2 but asked in DPP context' },

  // ── Orphaned questions (section "?", subsection "General Section") — older PIDSL duplicates ──
  { legacy_question_id: '87fa6106-f63e-43c6-91b7-73322d1ea831', canonical_parameter_id: P['5.1.1'], confidence: 0.85, reasoning: 'Orphaned duplicate: CMR per CLP Regulation — same as PIDSL 5.1.1' },
  { legacy_question_id: '5ce3428a-231f-4091-85f6-ccfa9b326d1a', canonical_parameter_id: P['5.1.1'], confidence: 0.7, reasoning: 'Orphaned detail for CMR' },
  { legacy_question_id: '0b41eecf-d752-4500-b86d-33f31d467c0b', canonical_parameter_id: P['5.1.2'], confidence: 0.85, reasoning: 'Orphaned duplicate: SVHC Article 59 — same as PIDSL 5.1.2' },
  { legacy_question_id: '8bfaa7b4-2f53-45a2-b8b1-e25e20521ba4', canonical_parameter_id: P['5.1.2'], confidence: 0.7, reasoning: 'Orphaned detail for SVHC' },
  { legacy_question_id: 'fb85817e-7924-479c-b13b-a35a2e02c9b0', canonical_parameter_id: P['5.1.3'], confidence: 0.85, reasoning: 'Orphaned duplicate: Annex XIV REACH — same as PIDSL 5.1.3' },
  { legacy_question_id: '4f09e067-3124-4140-bbf6-beccab8cd19d', canonical_parameter_id: P['5.1.3'], confidence: 0.7, reasoning: 'Orphaned detail for Annex XIV' },
  { legacy_question_id: 'b0611f59-4d32-4956-b5a9-bbfbe310b3f0', canonical_parameter_id: P['5.1.4'], confidence: 0.85, reasoning: 'Orphaned duplicate: Annex XVII REACH — same as PIDSL 5.1.4' },
  { legacy_question_id: 'd3da8f1f-285e-4e0d-95b9-84383689d52a', canonical_parameter_id: P['5.1.4'], confidence: 0.7, reasoning: 'Orphaned detail for Annex XVII' },
  { legacy_question_id: '2475b215-fc14-4816-a086-fe638b276c3f', canonical_parameter_id: P['5.1.5'], confidence: 0.85, reasoning: 'Orphaned duplicate: CoRAP — same as PIDSL 5.1.5' },
  { legacy_question_id: 'b26cc225-4660-4b84-bcc9-c270f8a94a9b', canonical_parameter_id: P['5.1.5'], confidence: 0.7, reasoning: 'Orphaned detail for CoRAP' },
  { legacy_question_id: '467085a7-694f-4327-b526-ef849d4aa5d4', canonical_parameter_id: P['5.1.6'], confidence: 0.85, reasoning: 'Orphaned duplicate: Water Framework Directive — same as PIDSL 5.1.6' },
  { legacy_question_id: '866b54a8-49ee-4475-9b53-2d79010234c5', canonical_parameter_id: P['5.1.6'], confidence: 0.7, reasoning: 'Orphaned detail for Water Framework Directive' },
  { legacy_question_id: '530bcf38-7c0c-4958-af0d-5f527add4643', canonical_parameter_id: P['5.1.7'], confidence: 0.85, reasoning: 'Orphaned duplicate: POP — same as PIDSL 5.1.7' },
  { legacy_question_id: 'a8bb5e71-18ce-433c-9d08-133463cbc6f2', canonical_parameter_id: P['5.1.7'], confidence: 0.7, reasoning: 'Orphaned detail for POP' },
  { legacy_question_id: 'cb7aa4b8-06d8-4654-b4d2-f120eec81b1c', canonical_parameter_id: P['5.1.8'], confidence: 0.85, reasoning: 'Orphaned duplicate: Heavy metals CONEG — same as PIDSL 5.1.8' },
  { legacy_question_id: '915182dc-d0c1-453d-af16-787fdceeb822', canonical_parameter_id: P['5.1.8'], confidence: 0.7, reasoning: 'Orphaned detail for CONEG' },
  { legacy_question_id: '676ca9bd-73c5-4bc6-b39c-e376b2d1bc5b', canonical_parameter_id: null, confidence: 0, reasoning: 'Orphaned "If yes, details" without clear parent question — cannot determine which parameter' },
  { legacy_question_id: '4f94920d-a3a1-456a-935f-d4560a29faa2', canonical_parameter_id: P['5.1.9'], confidence: 0.85, reasoning: 'Orphaned duplicate: EN 71-3/71-9 — same as PIDSL 5.1.9' },
  { legacy_question_id: 'cf4648ad-01f6-452a-801b-3309b5a5fa73', canonical_parameter_id: P['5.1.10'], confidence: 0.85, reasoning: 'Orphaned duplicate: California Proposition 65 — same as PIDSL 5.1.10' },
  { legacy_question_id: 'cdd081c2-ce97-48e8-a7c6-a28d99fb99c2', canonical_parameter_id: P['5.1.11'], confidence: 0.85, reasoning: 'Orphaned duplicate: PIDSL List — same as PIDSL 5.1.11' },

  // ── Last orphan ──
  { legacy_question_id: 'f132d84b-28d2-4bec-86e4-e97c70c331f4', canonical_parameter_id: null, confidence: 0, reasoning: 'Add a comment — UI element, not a compliance question' },
];

async function storeMappings() {
  console.log('=== Phase 2: Store Normalization Mappings ===\n');
  console.log(`Total mappings: ${mappings.length}`);

  // Snapshot
  const { count: qCount } = await supabase.from('questions').select('*', { count: 'exact', head: true });
  const { count: aCount } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  console.log(`  questions: ${qCount} rows`);
  console.log(`  answers: ${aCount} rows`);

  // Clear existing
  const { error: delError } = await supabase
    .from('normalization_mappings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (delError) {
    console.error('Failed to clear:', delError.message);
    process.exit(1);
  }

  // Insert in batches
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < mappings.length; i += BATCH) {
    const batch = mappings.slice(i, i + BATCH).map(m => ({
      legacy_question_id: m.legacy_question_id,
      canonical_parameter_id: m.canonical_parameter_id,
      confidence: m.confidence,
      reasoning: m.reasoning,
      status: 'pending',
    }));

    const { error } = await supabase.from('normalization_mappings').insert(batch);
    if (error) {
      console.error(`Batch at ${i} failed:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${mappings.length}`);
  }

  // Stats
  const matched = mappings.filter(m => m.canonical_parameter_id !== null);
  const high = matched.filter(m => m.confidence > 0.85);
  const medium = matched.filter(m => m.confidence >= 0.5 && m.confidence <= 0.85);
  const low = matched.filter(m => m.confidence > 0 && m.confidence < 0.5);
  const noMatch = mappings.filter(m => m.canonical_parameter_id === null);

  console.log(`\n--- Quick Stats ---`);
  console.log(`  Total: ${mappings.length}`);
  console.log(`  Matched: ${matched.length} (${(matched.length / mappings.length * 100).toFixed(0)}%)`);
  console.log(`  High confidence (>0.85): ${high.length}`);
  console.log(`  Medium confidence (0.5-0.85): ${medium.length}`);
  console.log(`  Low confidence (<0.5): ${low.length}`);
  console.log(`  No match: ${noMatch.length}`);

  const goNoGo = high.length / mappings.length;
  console.log(`\n  CDR Go/No-Go: ${(goNoGo * 100).toFixed(1)}% high-confidence (threshold: 70%)`);
  if (goNoGo >= 0.7) {
    console.log('  >>> CDR VALIDATED <<<');
  } else {
    console.log('  >>> Below threshold — review needed <<<');
  }

  // Verify unchanged
  const { count: qCount2 } = await supabase.from('questions').select('*', { count: 'exact', head: true });
  const { count: aCount2 } = await supabase.from('answers').select('*', { count: 'exact', head: true });
  console.log(`\n  questions: ${qCount2} rows ${qCount2 === qCount ? '[UNCHANGED]' : '[CHANGED!]'}`);
  console.log(`  answers: ${aCount2} rows ${aCount2 === aCount ? '[UNCHANGED]' : '[CHANGED!]'}`);

  console.log('\nDone. Run normalization-report.ts for full details.');
}

storeMappings().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

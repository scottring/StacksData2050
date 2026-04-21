import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Polarity: 'positive' = Yes is favorable, 'negative' = No is favorable, 'neutral' = informational
const polarityMap: Record<string, 'positive' | 'negative' | 'neutral'> = {
  // Section 2: Ecolabels — "does product meet this standard?" → positive
  '2.1.1': 'positive', '2.1.2': 'positive', '2.1.3': 'positive', '2.1.4': 'positive',
  '2.2.1': 'positive', '2.2.2': 'positive', '2.2.3': 'positive', '2.2.4': 'positive', '2.2.5': 'positive',
  '2.3.1': 'positive', '2.3.2': 'positive', '2.3.3': 'positive', '2.3.4': 'positive', '2.3.5': 'positive',

  // Section 3: Biocides
  '3.1.1': 'negative',  // "does product contain biocidal active substances?" — No = clean
  '3.1.2': 'neutral',   // "used for in-can preservation (PT 6)?" — informational
  '3.1.3': 'positive',  // "listed in Article 95 list under PT 6?" — Yes = compliant
  '3.1.4': 'positive',  // "supplier listed as approved for PT 6?" — Yes = compliant
  '3.1.5': 'neutral',   // "used as slimicides (PT 12)?" — informational
  '3.1.6': 'positive',  // "listed in Article 95 list under PT 12?" — Yes = compliant
  '3.1.7': 'positive',  // "supplier listed as approved for PT 12?" — Yes = compliant
  '3.1.8': 'neutral',   // "used as Preservatives (PT 11)?" — informational
  '3.1.9': 'positive',  // "listed in Article 95 list under PT 11?" — Yes = compliant
  '3.1.10': 'positive', // "supplier listed as approved for PT 11?" — Yes = compliant

  // Section 4: Food Contact
  '4.1.1': 'positive',  // "Can product be used for food contact?" — Yes = good
  '4.2.1': 'positive',  // "comply with Framework Regulation?" — Yes = good
  '4.3.1': 'positive',  // BfR XIV — compliance
  '4.3.2': 'positive',  // BfR XXXVI — compliance
  '4.3.3': 'positive',  // BfR XXXVI/1 — compliance
  '4.3.4': 'positive',  // BfR XXXVI/2 — compliance
  '4.3.5': 'positive',  // BfR XXXVI/3 — compliance
  '4.4.1': 'positive',  // Netherlands — comply
  '4.4.2': 'positive',  // Netherlands — comply
  '4.5.1': 'positive',  // Switzerland — comply
  '4.6.1': 'positive',  // Italy — comply
  '4.7.1': 'positive',  // France — comply
  '4.8.1': 'negative',  // "Are components listed with specific limits in EU plastics?" — No = clean
  '4.9.1': 'positive',  // USA 176.170 — can be used
  '4.9.2': 'positive',  // USA 176.180 — can be used
  '4.9.3': 'positive',  // USA 175.105 — compliance
  '4.9.4': 'positive',  // USA 175.300 — compliance
  '4.9.5': 'positive',  // USA 176.300 — compliance
  '4.9.6': 'positive',  // USA 176.200 — compliance
  '4.9.7': 'positive',  // USA 176.210 — compliance
  '4.9.8': 'positive',  // FCN — Yes = good
  '4.10.1': 'positive', // China GB 4806.1 — in accordance
  '4.10.2': 'positive', // China GB 4806.8 — fulfill
  '4.10.3': 'positive', // China GB 9685 — comply
  '4.10.4': 'positive', // China other GB — comply
  '4.11.1': 'positive', // MERCOSUR 03/92 — comply
  '4.11.2': 'positive', // MERCOSUR 39/19 — comply
  '4.11.3': 'positive', // MERCOSUR 40/15 — comply
  '4.11.4': 'positive', // MERCOSUR 41/15 — comply
  '4.11.5': 'positive', // MERCOSUR 42/15 — comply
  '4.11.6': 'positive', // MERCOSUR 02/12 — comply

  // Section 5: PIDSL — all "does product contain [hazardous substance]?" → No = clean
  '5.1.1': 'negative',  // CMR substances
  '5.1.2': 'negative',  // SVHC substances
  '5.1.3': 'negative',  // Annex XIV substances
  '5.1.4': 'negative',  // Annex XVII substances
  '5.1.5': 'negative',  // CoRAP substances
  '5.1.6': 'negative',  // Water Framework Directive substances
  '5.1.7': 'negative',  // POPs
  '5.1.8': 'negative',  // Heavy metals >100ppm
  '5.1.9': 'negative',  // EN 71-3 restricted elements
  '5.1.10': 'negative', // California Prop 65
  '5.1.11': 'negative', // PIDSL List

  // Section 6: Additional Requirements
  '6.1.1': 'positive',  // Kosher certification — Yes = good
  '6.1.2': 'positive',  // Halal certification — Yes = good
  '6.2.1': 'negative',  // Passover prohibited substances added — No = clean
  '6.3.1': 'negative',  // Animal origin substances added — No = clean
  '6.4.1': 'negative',  // BSE/TSE concern — No = clean
  '6.5.1': 'negative',  // Ethanol added — No = clean
  '6.5.2': 'neutral',   // Ethanol from plant source — informational follow-up
  '6.6.1': 'negative',  // EU food allergens added — No = clean
  '6.6.2': 'negative',  // US food allergens added — No = clean
  '6.7.1': 'negative',  // Nanomaterials added — No = clean
  '6.8.1': 'negative',  // GMOs added — No = clean
  '6.9.1': 'negative',  // Mineral Oil Hydrocarbons — No = clean
  '6.10.1': 'negative', // Conflict minerals — No = clean
  '6.11.1': 'negative', // Palm Oil — No = clean
};

async function main() {
  // Step 1: Add polarity column (if it doesn't exist)
  console.log('Adding polarity column...');
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE canonical_parameters ADD COLUMN IF NOT EXISTS polarity text DEFAULT 'neutral';`
  });

  if (alterError) {
    // Try direct SQL via REST if RPC doesn't exist
    console.log('RPC not available, trying direct approach...');
    // We'll just do updates — the column might already exist or we add it manually
  }

  // Step 2: Update polarity for each parameter
  let updated = 0;
  let errors = 0;
  for (const [code, polarity] of Object.entries(polarityMap)) {
    const { error } = await supabase
      .from('canonical_parameters')
      .update({ polarity })
      .eq('code', code);

    if (error) {
      // If column doesn't exist, we need to add it first
      if (error.message.includes('polarity')) {
        console.error('Column "polarity" does not exist. Please run this SQL first:');
        console.error('  ALTER TABLE canonical_parameters ADD COLUMN polarity text DEFAULT \'neutral\';');
        process.exit(1);
      }
      console.error(`  Error updating ${code}: ${error.message}`);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`Updated ${updated} parameters, ${errors} errors`);

  // Verify
  const { data: verify } = await supabase
    .from('canonical_parameters')
    .select('code, polarity')
    .order('sort_order');

  const counts = { positive: 0, negative: 0, neutral: 0, null: 0 };
  verify?.forEach(p => {
    const pol = p.polarity || 'null';
    counts[pol as keyof typeof counts]++;
  });

  console.log('\nPolarity distribution:');
  console.log(`  positive: ${counts.positive}`);
  console.log(`  negative: ${counts.negative}`);
  console.log(`  neutral: ${counts.neutral}`);
  console.log(`  null: ${counts.null}`);
}

main().catch(err => { console.error(err); process.exit(1); });

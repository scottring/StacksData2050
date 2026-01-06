import 'dotenv/config';

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  bubble: {
    apiUrl: process.env.BUBBLE_API_URL!,
    apiToken: process.env.BUBBLE_API_TOKEN!,
  },
  migration: {
    dryRun: process.env.DRY_RUN === 'true',
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    freshAnswers: process.env.FRESH_ANSWERS === 'true', // Truncate answers and skip duplicate checks
  },
};

// Validate required env vars
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BUBBLE_API_URL',
  'BUBBLE_API_TOKEN',
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

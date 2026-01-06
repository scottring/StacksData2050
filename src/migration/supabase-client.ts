import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Create a Supabase client with service role key for admin operations
export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to handle Supabase errors consistently
export function handleSupabaseError(error: unknown, context: string): never {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  throw new Error(`Supabase error in ${context}: ${message}`);
}

// Batch insert helper with conflict handling
export async function batchInsert<T extends Record<string, unknown>>(
  table: string,
  records: T[],
  options: {
    onConflict?: string;
    batchSize?: number;
  } = {}
): Promise<number> {
  const { onConflict, batchSize = 50 } = options;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    let query = supabase.from(table).insert(batch);

    if (onConflict) {
      query = supabase.from(table).upsert(batch, { onConflict });
    }

    const { error } = await query;

    if (error) {
      handleSupabaseError(error, `batchInsert to ${table}`);
    }

    inserted += batch.length;
  }

  return inserted;
}

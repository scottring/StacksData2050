import { supabase, handleSupabaseError } from './supabase-client.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('IdMapper');

export type EntityType =
  | 'company'
  | 'user'
  | 'tag'
  | 'question'
  | 'sheet'
  | 'answer'
  | 'request'
  | 'sheet_status'
  | 'association'
  | 'stack'
  | 'section'
  | 'subsection'
  | 'choice'
  | 'list_table'
  | 'list_table_column'
  | 'list_table_row'
  | 'comment'
  | 'packet';

// In-memory cache for faster lookups
const cache = new Map<string, string>();

function getCacheKey(bubbleId: string, entityType: EntityType): string {
  return `${entityType}:${bubbleId}`;
}

/**
 * Check if a Bubble ID has already been migrated
 */
export async function isMigrated(
  bubbleId: string,
  entityType: EntityType
): Promise<boolean> {
  const cacheKey = getCacheKey(bubbleId, entityType);

  if (cache.has(cacheKey)) {
    return true;
  }

  const { data, error } = await supabase
    .from('_migration_id_map')
    .select('supabase_id')
    .eq('bubble_id', bubbleId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (error) {
    handleSupabaseError(error, 'isMigrated');
  }

  if (data) {
    cache.set(cacheKey, data.supabase_id);
    return true;
  }

  return false;
}

/**
 * Get the Supabase UUID for a Bubble ID
 */
export async function getSupabaseId(
  bubbleId: string | undefined | null,
  entityType: EntityType
): Promise<string | null> {
  if (!bubbleId) {
    return null;
  }

  const cacheKey = getCacheKey(bubbleId, entityType);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const { data, error } = await supabase
    .from('_migration_id_map')
    .select('supabase_id')
    .eq('bubble_id', bubbleId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (error) {
    handleSupabaseError(error, 'getSupabaseId');
  }

  if (data) {
    cache.set(cacheKey, data.supabase_id);
    return data.supabase_id;
  }

  logger.warn(`No mapping found for ${entityType}:${bubbleId}`);
  return null;
}

/**
 * Record a new ID mapping
 */
export async function recordMapping(
  bubbleId: string,
  supabaseId: string,
  entityType: EntityType
): Promise<void> {
  const { error } = await supabase
    .from('_migration_id_map')
    .insert({
      bubble_id: bubbleId,
      supabase_id: supabaseId,
      entity_type: entityType,
    });

  if (error) {
    // Ignore duplicate key errors (already mapped)
    if (!error.message.includes('duplicate key')) {
      handleSupabaseError(error, 'recordMapping');
    }
  }

  cache.set(getCacheKey(bubbleId, entityType), supabaseId);
}

/**
 * Batch lookup for multiple IDs (more efficient for lists)
 */
export async function getSupabaseIds(
  bubbleIds: (string | undefined | null)[],
  entityType: EntityType
): Promise<(string | null)[]> {
  const validIds = bubbleIds.filter((id): id is string => !!id);

  if (validIds.length === 0) {
    return bubbleIds.map(() => null);
  }

  // Check cache first
  const uncachedIds: string[] = [];
  const results = new Map<string, string | null>();

  for (const id of validIds) {
    const cacheKey = getCacheKey(id, entityType);
    if (cache.has(cacheKey)) {
      results.set(id, cache.get(cacheKey)!);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached IDs from database
  if (uncachedIds.length > 0) {
    const { data, error } = await supabase
      .from('_migration_id_map')
      .select('bubble_id, supabase_id')
      .eq('entity_type', entityType)
      .in('bubble_id', uncachedIds);

    if (error) {
      handleSupabaseError(error, 'getSupabaseIds');
    }

    // Update cache and results
    for (const row of data || []) {
      cache.set(getCacheKey(row.bubble_id, entityType), row.supabase_id);
      results.set(row.bubble_id, row.supabase_id);
    }
  }

  // Map original array, preserving order and nulls
  return bubbleIds.map(id => {
    if (!id) return null;
    return results.get(id) ?? null;
  });
}

/**
 * Batch record multiple ID mappings at once (faster for bulk operations)
 */
export async function recordMappingsBatch(
  mappings: Array<{ bubbleId: string; supabaseId: string }>,
  entityType: EntityType
): Promise<void> {
  if (mappings.length === 0) return;

  const entries = mappings.map(m => ({
    bubble_id: m.bubbleId,
    supabase_id: m.supabaseId,
    entity_type: entityType,
  }));

  const { error } = await supabase
    .from('_migration_id_map')
    .insert(entries);

  if (error && !error.message.includes('duplicate key')) {
    handleSupabaseError(error, 'recordMappingsBatch');
  }

  // Update cache
  for (const m of mappings) {
    cache.set(getCacheKey(m.bubbleId, entityType), m.supabaseId);
  }
}

/**
 * Clear the in-memory cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Preload cache for an entity type (call before batch operations)
 */
export async function preloadCache(entityType: EntityType): Promise<number> {
  const { data, error } = await supabase
    .from('_migration_id_map')
    .select('bubble_id, supabase_id')
    .eq('entity_type', entityType);

  if (error) {
    handleSupabaseError(error, 'preloadCache');
  }

  for (const row of data || []) {
    cache.set(getCacheKey(row.bubble_id, entityType), row.supabase_id);
  }

  return data?.length || 0;
}

// Choice content cache for looking up by text value
const choiceContentCache = new Map<string, string>();

/**
 * Preload choice content cache for text-based lookups
 */
export async function preloadChoiceContentCache(): Promise<number> {
  const { data, error } = await supabase
    .from('choices')
    .select('id, content, import_map');

  if (error) {
    handleSupabaseError(error, 'preloadChoiceContentCache');
  }

  for (const row of data || []) {
    // Index by content
    if (row.content) {
      choiceContentCache.set(row.content.toLowerCase().trim(), row.id);
    }
    // Index by import_map if different
    if (row.import_map && row.import_map !== row.content) {
      choiceContentCache.set(row.import_map.toLowerCase().trim(), row.id);
    }
  }

  return data?.length || 0;
}

/**
 * Get choice ID by matching text content (not bubble ID)
 */
export function getChoiceIdByContent(text: string | undefined | null): string | null {
  if (!text) {
    return null;
  }

  const normalized = text.toLowerCase().trim();
  return choiceContentCache.get(normalized) || null;
}

import type { SupabaseClient } from '@supabase/supabase-js'

// Sheet ids of withdrawn requests the company sent or received. Sheet-based
// lists use this to hide sheets whose request was withdrawn. Returns an empty
// set on error so a list never fails because of this lookup.
export async function getWithdrawnSheetIds(
  supabase: SupabaseClient,
  companyId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('requests')
    .select('sheet_id')
    .or(`requestor_id.eq.${companyId},requesting_from_id.eq.${companyId}`)
    .not('withdrawn_at', 'is', null)

  if (error) {
    console.error('Error fetching withdrawn requests:', error)
    return new Set()
  }

  return new Set(
    (data || []).map(r => r.sheet_id as string | null).filter((id): id is string => !!id)
  )
}

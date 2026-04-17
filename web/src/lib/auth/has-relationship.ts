import { createClient } from '@supabase/supabase-js'

type ServiceClient = ReturnType<typeof createClient>

export async function companiesHaveRelationship(
  serviceClient: ServiceClient,
  myCompanyId: string,
  targetCompanyId: string
): Promise<boolean> {
  if (myCompanyId === targetCompanyId) return true

  const { count: sheetCount } = await serviceClient
    .from('sheets')
    .select('id', { count: 'exact', head: true })
    .or(
      `and(company_id.eq.${myCompanyId},requesting_company_id.eq.${targetCompanyId}),` +
        `and(company_id.eq.${targetCompanyId},requesting_company_id.eq.${myCompanyId})`
    )

  if ((sheetCount ?? 0) > 0) return true

  const { count: requestCount } = await serviceClient
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .or(
      `and(requestor_id.eq.${myCompanyId},requesting_from_id.eq.${targetCompanyId}),` +
        `and(requestor_id.eq.${targetCompanyId},requesting_from_id.eq.${myCompanyId})`
    )

  return (requestCount ?? 0) > 0
}

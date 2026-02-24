import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const sheetId = body.sheet_id || null

  // Get the document and its extraction items
  const { data: doc } = await supabase
    .from('extraction_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: items } = await supabase
    .from('extraction_items')
    .select('*')
    .eq('document_id', id)
    .eq('item_type', 'chemical')

  if (!items || items.length === 0) {
    // Still confirm the document even with no chemicals
    await supabase
      .from('extraction_documents')
      .update({ status: 'confirmed', sheet_id: sheetId })
      .eq('id', id)

    return NextResponse.json({ chemicals_added: 0, chemicals_linked: 0 })
  }

  let chemicalsAdded = 0
  let chemicalsLinked = 0

  for (const item of items) {
    const chemData = item.data as Record<string, unknown>
    const casNumber = chemData.cas_number as string | undefined

    if (!casNumber) continue

    // Upsert into chemical_inventory
    const { data: existing } = await supabase
      .from('chemical_inventory')
      .select('id')
      .eq('cas_number', casNumber)
      .single()

    let chemicalId: string

    if (existing) {
      chemicalId = existing.id
    } else {
      const { data: newChem, error: insertError } = await supabase
        .from('chemical_inventory')
        .insert({
          cas_number: casNumber,
          chemical_name: (chemData.chemical_name as string) || null,
          data_source: 'extraction',
        })
        .select('id')
        .single()

      if (insertError || !newChem) continue
      chemicalId = newChem.id
      chemicalsAdded++
    }

    // Update extraction item with chemical_id
    await supabase
      .from('extraction_items')
      .update({ chemical_id: chemicalId })
      .eq('id', item.id)

    // Link to sheet if provided
    if (sheetId) {
      const concentration = (chemData.concentration_max_pct as number) || (chemData.concentration_min_pct as number) || null

      await supabase
        .from('sheet_chemicals')
        .upsert(
          {
            sheet_id: sheetId,
            chemical_id: chemicalId,
            concentration: concentration,
            concentration_unit: concentration ? '%' : null,
          },
          { onConflict: 'sheet_id,chemical_id' }
        )

      chemicalsLinked++
    }
  }

  // Mark document as confirmed
  await supabase
    .from('extraction_documents')
    .update({ status: 'confirmed', sheet_id: sheetId })
    .eq('id', id)

  return NextResponse.json({
    chemicals_added: chemicalsAdded,
    chemicals_linked: chemicalsLinked,
    sheet_id: sheetId,
  })
}

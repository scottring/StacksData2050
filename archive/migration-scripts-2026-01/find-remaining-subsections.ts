import { supabase } from './src/migration/supabase-client.js'

async function findRemainingSubsections() {
  const ids = [
    '2e7fd479-c3d7-4b37-9bfe-7aeba76d0bf7',
    '0add0640-1525-455e-ba2f-de9e48f96e7b',
    'd0c40191-dc50-4d78-9373-475860508598',
    '3b2eafe8-4a6e-4b99-8f2e-819a3ad79df1',
    'a50ab660-e034-4940-b648-165b0f9c3537',
    'ebc21316-87dc-4b23-904c-e2b552d4a02d'
  ]

  console.log('=== Finding Remaining Subsections ===\n')

  for (const id of ids) {
    const { data: sub } = await supabase
      .from('subsections')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (sub) {
      console.log(`${sub.name}`)
      console.log(`  ID: ${sub.id}`)
      console.log(`  Bubble ID: ${sub.bubble_id}`)
      console.log(`  Section ID: ${sub.section_id}`)
      console.log(`  Order: ${sub.order_number}`)
      console.log()
    } else {
      console.log(`Subsection ${id} NOT FOUND\n`)
    }
  }

  // Fix them
  console.log('Assigning order numbers...\n')

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from('subsections')
      .update({ order_number: 50 + i })
      .eq('id', ids[i])

    if (!error) {
      console.log(`✓ Fixed subsection ${ids[i]}`)
    }
  }
}

findRemainingSubsections()

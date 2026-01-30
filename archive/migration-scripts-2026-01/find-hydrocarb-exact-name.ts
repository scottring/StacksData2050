import { supabase } from './src/migration/supabase-client.js'

async function findSheet() {
  const result = await supabase
    .from('sheets')
    .select('id, name, bubble_id, version, created_at')
    .eq('name', 'Hydrocarb 90-ME 78%')
    .order('version')

  console.log('Found ' + (result.data?.length || 0) + ' sheets named "Hydrocarb 90-ME 78%":\n')

  if (result.data) {
    for (const sheet of result.data) {
      console.log('Version ' + sheet.version + ':')
      console.log('  ID: ' + sheet.id)
      console.log('  Bubble ID: ' + sheet.bubble_id)
      console.log('  Created: ' + sheet.created_at)

      const answerResult = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('parent_sheet_id', sheet.id)

      console.log('  Answers: ' + (answerResult.count || 0))
      console.log()
    }
  }
}

findSheet()

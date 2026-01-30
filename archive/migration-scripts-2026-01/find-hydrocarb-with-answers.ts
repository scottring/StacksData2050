import { supabase } from './src/migration/supabase-client.js'

async function findSheet() {
  const result = await supabase
    .from('sheets')
    .select('id, name, bubble_id, version, created_at, modified_at')
    .ilike('name', 'HYDROCARB%90%ME%78%')
    .order('created_at')

  console.log('Found ' + (result.data?.length || 0) + ' sheets:\n')

  if (result.data) {
    for (const sheet of result.data) {
      const answerResult = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('parent_sheet_id', sheet.id)

      const answerCount = answerResult.count || 0
      
      console.log('Name: ' + sheet.name)
      console.log('  Version: ' + sheet.version)
      console.log('  ID: ' + sheet.id)
      console.log('  Bubble ID: ' + sheet.bubble_id)
      console.log('  Answers: ' + answerCount)
      
      if (answerCount > 0) {
        console.log('  *** HAS ANSWERS ***')
        
        const sampleAnswers = await supabase
          .from('answers')
          .select('answer, created_at')
          .eq('parent_sheet_id', sheet.id)
          .limit(3)
        
        console.log('  Sample answers:')
        sampleAnswers.data?.forEach((a, i) => {
          console.log('    ' + (i+1) + '. ' + (a.answer || '(empty)'))
        })
      }
      console.log()
    }
  }
}

findSheet()

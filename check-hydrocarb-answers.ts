import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function checkAnswers() {
  const sheets = [
    { version: 1, bubbleId: '1659961669315x991901828578803700', date: 'Aug 8, 2022' },
    { version: 2, bubbleId: '1661440851034x545387418125598700', date: 'Aug 25, 2022' },
    { version: 3, bubbleId: '1744099239597x968220647214809100', date: 'Apr 8, 2025' }
  ]

  for (const sheet of sheets) {
    console.log('\n' + '-'.repeat(60))
    console.log('VERSION ' + sheet.version + ' (' + sheet.date + ')')
    console.log('-'.repeat(60))

    const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Parent Sheet","constraint_type":"equals","value":"' + sheet.bubbleId + '"}]&limit=10'

    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
    })
    const data = await response.json()
    const bubbleAnswers = data.response?.results || []

    console.log('\nBubble: ' + bubbleAnswers.length + ' answers (showing up to 10)')

    const supabaseSheetResult = await supabase
      .from('sheets')
      .select('id')
      .eq('bubble_id', sheet.bubbleId)
      .single()

    if (supabaseSheetResult.data) {
      const answersResult = await supabase
        .from('answers')
        .select('*', { count: 'exact' })
        .eq('parent_sheet_id', supabaseSheetResult.data.id)
        .limit(5)

      console.log('Supabase: ' + (answersResult.count || 0) + ' answers')
    }
  }
}

checkAnswers()

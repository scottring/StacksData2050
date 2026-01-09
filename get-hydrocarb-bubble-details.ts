import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

const HYDROCARB_VERSIONS = [
  { version: 1, bubble_id: '1659961669315x991901828578803700' },
  { version: 2, bubble_id: '1661440851034x545387418125598700' },
  { version: 3, bubble_id: '1744099239597x968220647214809100' }
]

async function getHydrocarbBubbleDetails() {
  console.log('=== HYDROCARB 90-ME 78% Answer Analysis in Bubble ===\n')

  for (const v of HYDROCARB_VERSIONS) {
    console.log('='.repeat(80))
    console.log(`Version ${v.version} (${v.bubble_id})`)
    console.log()

    // Get answers for this sheet version
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${v.bubble_id}"}]`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    })

    const data = await response.json() as any

    if (data.response?.count) {
      console.log(`Total answers in Bubble: ${data.response.count}`)
      console.log(`Showing: ${data.response.results.length}`)
      console.log(`Remaining: ${data.response.remaining}`)

      if (data.response.results.length > 0) {
        // Get unique questions
        const questions = new Set(data.response.results.map((a: any) => a['Parent Question']))
        console.log(`Unique questions answered: ${questions.size}`)

        // Get timestamp range
        const created = data.response.results.map((a: any) => new Date(a['Created Date']).getTime())
        const modified = data.response.results.map((a: any) => new Date(a['Modified Date']).getTime())

        console.log('\nTimestamp Analysis:')
        console.log(`  Earliest created: ${new Date(Math.min(...created)).toISOString()}`)
        console.log(`  Latest created: ${new Date(Math.max(...created)).toISOString()}`)
        console.log(`  Latest modified: ${new Date(Math.max(...modified)).toISOString()}`)

        // Show sample answers
        console.log('\nSample Answers (first 5):')
        data.response.results.slice(0, 5).forEach((answer: any, i: number) => {
          console.log(`\n  Answer ${i + 1}:`)
          console.log(`    Created: ${answer['Created Date']}`)
          console.log(`    Modified: ${answer['Modified Date']}`)
          console.log(`    Question: ${answer['Parent Question']}`)
          if (answer.Choice) console.log(`    Choice: ${answer.Choice}`)
          if (answer.text) console.log(`    Text: ${answer.text.substring(0, 60)}...`)
          if (answer['Boolean Value'] !== undefined) console.log(`    Boolean: ${answer['Boolean Value']}`)
        })

        // Check if answers were copied
        const withVersionCopied = data.response.results.filter((a: any) => a['version copied'])
        console.log(`\n  Answers with "version copied": ${withVersionCopied.length}`)

        // Compare with Supabase
        console.log('\n  📊 Bubble vs Supabase:')
        console.log(`     Bubble: ${data.response.count} answers`)

        // We know from earlier that Supabase has:
        if (v.version === 1) {
          console.log(`     Supabase: 667 answers`)
          console.log(`     ⚠️  Difference: ${Math.abs(data.response.count - 667)} answers`)
        } else {
          console.log(`     Supabase: 0 answers`)
          if (data.response.count > 0) {
            console.log(`     ❌ MIGRATION ISSUE: ${data.response.count} answers missing in Supabase!`)
          }
        }
      }
    } else {
      console.log('No answers found')
    }

    console.log()
  }

  console.log('\n=== Summary ===\n')
  console.log('Key Findings:')
  console.log('  - Check if all 3 versions have answers in Bubble')
  console.log('  - Compare total counts between Bubble and Supabase')
  console.log('  - Identify if there was a migration issue')
}

getHydrocarbBubbleDetails()

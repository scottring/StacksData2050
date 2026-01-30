import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkBubbleBiocides() {
  console.log('=== Checking Bubble Biocides Answers ===\n')

  // The sheet in Bubble (need to find the Bubble ID)
  // Let me first get the sheet to find its bubble_id

  const bubbleSheetId = '1636031591594x483952580354375700' // Hydrocarb sheet bubble_id

  // Get answers from Bubble for this sheet
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${bubbleSheetId}"}]`

  console.log('Fetching from Bubble API...\n')

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  })

  const data: any = await response.json()

  console.log(`Total answers in Bubble: ${data.response?.results?.length || 0}\n`)

  // Find biocides section answers (section 3.1.x)
  const biocideAnswers = data.response?.results?.filter((a: any) => {
    const qNum = a.Originating_Question_custom?.display
    return qNum && qNum.startsWith('3.1.')
  }) || []

  console.log(`Biocides section answers: ${biocideAnswers.length}\n`)

  // Show the relevant ones
  const relevantQuestions = ['3.1.3', '3.1.4', '3.1.5', '3.1.6', '3.1.7', '3.1.8', '3.1.9', '3.1.10']

  biocideAnswers
    .filter((a: any) => relevantQuestions.includes(a.Originating_Question_custom?.display))
    .sort((a: any, b: any) => {
      const aNum = parseFloat(a.Originating_Question_custom?.display?.replace('3.1.', '') || '999')
      const bNum = parseFloat(b.Originating_Question_custom?.display?.replace('3.1.', '') || '999')
      return aNum - bNum
    })
    .forEach((a: any) => {
      console.log(`Question ${a.Originating_Question_custom?.display}:`)
      console.log(`  Question text: ${a.Originating_Question_custom?.Name?.substring(0, 60)}...`)
      console.log(`  Answer _id: ${a._id}`)
      console.log(`  Choice: ${a.Choice_custom?.Name || 'NULL'}`)
      console.log(`  Text value: ${a['Text Value'] || 'NULL'}`)
      console.log(`  Boolean: ${a.Boolean ?? 'NULL'}`)
      console.log('')
    })
}

checkBubbleBiocides().catch(console.error)

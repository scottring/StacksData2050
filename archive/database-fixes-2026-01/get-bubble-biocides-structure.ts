import { config } from 'dotenv'
config()

const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

console.log('=== FETCHING BIOCIDES STRUCTURE FROM BUBBLE ===\n')

// Get Biocides section by name
const sectionResponse = await fetch(
  `${BUBBLE_API_URL}/obj/section?constraints=[{"key":"Name","constraint_type":"equals","value":"Biocides"}]`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
)

const sectionData = await sectionResponse.json()
const section = sectionData.response?.results?.[0]

if (!section) {
  console.log('Biocides section not found!')
  process.exit(1)
}

console.log(`Section: ${section.Name}`)
console.log(`Bubble ID: ${section._id}\n`)

// Get subsections
const subsectionResponse = await fetch(
  `${BUBBLE_API_URL}/obj/subsection?constraints=[{"key":"Parent Section","constraint_type":"equals","value":"${section._id}"}]&sort_field=Order Number`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
)

const subsectionData = await subsectionResponse.json()
const subsections = subsectionData.response?.results || []

console.log(`=== SUBSECTIONS (${subsections.length}) ===`)
subsections.forEach((sub, idx) => {
  console.log(`${idx + 1}. ${sub.Name} (Order: ${sub['Order Number']}, ID: ${sub._id})`)
})

console.log('\n=== QUESTIONS ===\n')

// Get all questions for this section
const questionResponse = await fetch(
  `${BUBBLE_API_URL}/obj/question?constraints=[{"key":"Parent Section","constraint_type":"equals","value":"${section._id}"}]&sort_field=Order Number`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
)

const questionData = await questionResponse.json()
const questions = questionData.response?.results || []

console.log(`Total questions: ${questions.length}\n`)

for (const q of questions) {
  console.log(`Order ${q['Order Number']}: ${q.Name}`)
  console.log(`  Bubble ID: ${q._id}`)
  console.log(`  Type: ${q['Question Type']}`)
  console.log(`  Parent Subsection: ${q['Parent Subsection']}`)

  // Get choices for this question
  const choiceResponse = await fetch(
    `${BUBBLE_API_URL}/obj/choice?constraints=[{"key":"Parent Question","constraint_type":"equals","value":"${q._id}"}]`,
    {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    }
  )

  const choiceData = await choiceResponse.json()
  const choices = choiceData.response?.results || []

  console.log(`  Choices: ${choices.length}`)
  choices.forEach(c => console.log(`    - ${c.Name || c.Content}`))
  console.log()
}

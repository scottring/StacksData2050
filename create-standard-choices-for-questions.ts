import { supabase } from './src/migration/supabase-client.js'

console.log('=== CREATING STANDARD CHOICES FOR QUESTIONS ===\n')

// These 36 questions don't have choices in Bubble, but their answers use Yes/No/Not assessed
// So we'll create these standard choices manually

const questionIdsNeedingChoices = [
  'c7364e6f-5148-422f-8531-cb43d53f3d93',
  'a50e6a48-86cf-4c00-a33f-65c8963788ef',
  '1114892c-d2bd-4441-b35b-fecbf94aa01e',
  '135148d3-b17e-4be2-bc36-96716513f5b0',
  'b0c29c9a-7873-4090-8ea5-6bdbc5ca74d7',
  'df812686-0d58-4557-8320-3b69621bb12c',
  '7ced6699-682e-4968-89b2-55308952598e',
  '0bdc8e83-b0c9-481e-93d0-ff4df93b485e',
  'ca468bc4-f610-4918-9739-cf68dfb057ba',
  'e62f3578-55bf-4eec-bf34-3855282cd13c',
  'c85b69b5-8d6c-4124-b4c9-ad6fb533acd4',
  '5f8d5d88-640c-4416-9387-9ef366da0954',
  'dbcc4189-d7e2-49bf-9c8e-886ec962b328',
  '3c3019ad-bb3e-4847-8833-bd540ff44488',
  '0bb06723-abba-4863-b118-a5c4b5548bed',
  '3ddb7f08-f610-4c55-8b5b-dc24be34feee',
  '22871456-3ec3-45b6-9a21-80fc850c5d66',
  '93740b75-9fc9-4a79-be42-505066d3c6f9',
  '4201a767-7917-44c5-aa44-9d4c9fc0531a',
  '0fcdef66-deac-499a-8302-6878cd2fd2a2',
  'a344aaa4-fae1-4b3c-b9b5-09a5598749d8',
  '33c50fe8-27cf-4f26-94ec-e72ef280587c',
  'f7ff6210-ecee-44f0-ab2c-2e69c1ca358a',
  'f8aaf101-3e47-4da4-a254-d6452dc014a7',
  '78b99539-6cfa-4958-b23d-428f0b551053',
  '8480e654-883e-41b3-9e9b-611a0a34a4e9',
  '62426376-f2ce-470c-a9ec-6fe9f148afa1',
  '4eaf0b3c-d7d9-4daf-81a6-9c72f0c48530',
  '0b7a20c9-e8c0-4a82-a6e4-006f9bb36f16',
  '3253b430-94e9-4274-8cf3-db3fba2e32d5',
  'c42c76d5-96f4-4bcd-8d53-ada574d4b0bf',
  'd24da05e-9f4c-4830-b555-65523ab52abd',
  '4cef7c46-2824-42ef-abf3-b8c926ced6a7',
  '7ba3350a-e995-4478-80dc-16c4c05be711',
  '5b31327b-18da-4755-8479-fb6f2503ca4a',
  '0e565750-13c8-427c-97fd-439cd47c8eae',
  '18ce474e-316a-4362-a2c5-a44d750daaa0',
  '2b269abe-779e-4bfa-80b9-8e4c3539dea2',
  '0a60421e-71ef-4c14-809e-0319dafa1e88',
  'ab2c6fd1-7113-420e-b95f-dd799c5dbedf',
  '0801a193-0fa4-41d1-b1ee-46f1ce61a10e',
  '84a75c4a-aa04-40fa-bc13-d629d6df57df',
  '57a24cf9-64ac-4bfb-b98a-462d8fa467a2'
]

const standardChoices = ['Yes', 'No', 'not assessed']

let choicesCreated = 0
let questionsProcessed = 0
let questionsFailed = 0

for (const questionId of questionIdsNeedingChoices) {
  // Verify question exists
  const { data: question } = await supabase
    .from('questions')
    .select('id, name, order_number')
    .eq('id', questionId)
    .maybeSingle()

  if (!question) {
    console.log(`  ⚠️  Question ${questionId} not found`)
    questionsFailed++
    continue
  }

  let createdForThisQuestion = 0

  // Create each standard choice
  for (const choiceContent of standardChoices) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('choices')
      .select('id')
      .eq('parent_question_id', questionId)
      .ilike('content', choiceContent)
      .maybeSingle()

    if (existing) {
      continue // Already exists
    }

    // Create the choice
    const { error } = await supabase
      .from('choices')
      .insert({
        parent_question_id: questionId,
        content: choiceContent,
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString()
      })

    if (error) {
      if (!error.message.includes('duplicate')) {
        console.log(`  ❌ Error creating "${choiceContent}" for Q${question.order_number}: ${error.message}`)
        questionsFailed++
      }
    } else {
      choicesCreated++
      createdForThisQuestion++
    }
  }

  if (createdForThisQuestion > 0) {
    questionsProcessed++
    console.log(`  ✓ [${questionsProcessed}/${questionIdsNeedingChoices.length}] Created ${createdForThisQuestion} choices for Q${question.order_number}: ${question.name?.substring(0, 50)}`)
  }
}

console.log(`\n=== CREATION COMPLETE ===`)
console.log(`Questions processed: ${questionsProcessed}`)
console.log(`Choices created: ${choicesCreated}`)
console.log(`Questions failed: ${questionsFailed}`)
console.log(`\nNext: Run remap script again to fix the remaining 30k orphaned answers`)

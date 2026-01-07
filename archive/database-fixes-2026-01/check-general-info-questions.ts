import { supabase } from './src/migration/supabase-client.js';

async function checkGeneralInfoQuestions() {
  // The two General Information subsections
  const productInfoGenInfo = '8e717b21-42b9-4d73-838c-12f8e5843893' // Under Product Information
  const foodContactGenInfo = '92f26968-cde8-4fc5-9de3-fbcabf20f0e0' // Under Food Contact

  console.log('=== GENERAL INFORMATION UNDER PRODUCT INFO ===')
  const { data: questions1 } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', productInfoGenInfo)
    .order('order_number')

  console.log(`ID: ${productInfoGenInfo}`)
  console.log(`Questions count: ${questions1?.length || 0}`)
  if (questions1 && questions1.length > 0) {
    questions1.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.name || q.content?.substring(0, 50)}`)
      console.log(`     Order: ${q.order_number}`)
    })
  }

  console.log('\n=== GENERAL INFORMATION UNDER FOOD CONTACT ===')
  const { data: questions2 } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', foodContactGenInfo)
    .order('order_number')

  console.log(`ID: ${foodContactGenInfo}`)
  console.log(`Questions count: ${questions2?.length || 0}`)
  if (questions2 && questions2.length > 0) {
    questions2.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.name || q.content?.substring(0, 50)}`)
      console.log(`     Order: ${q.order_number}`)
    })
  }

  console.log('\n=== RECOMMENDATION ===')
  if (questions1 && questions1.length > 0 && (!questions2 || questions2.length === 0)) {
    console.log('✅ Move questions from Product Info General Information to Food Contact General Information')
    console.log(`   Update ${questions1.length} questions to point to subsection ${foodContactGenInfo}`)
  } else if (questions2 && questions2.length > 0 && (!questions1 || questions1.length === 0)) {
    console.log('✅ Delete empty Product Info General Information subsection')
    console.log(`   Delete subsection ${productInfoGenInfo}`)
  } else if (questions1 && questions2 && questions1.length > 0 && questions2.length > 0) {
    console.log('⚠️  Both subsections have questions - need to determine which is correct')
  } else {
    console.log('⚠️  Both subsections are empty')
  }
}

checkGeneralInfoQuestions().catch(console.error)

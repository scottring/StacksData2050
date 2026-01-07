import { supabase } from './src/migration/supabase-client.js'

console.log('=== ANALYZING BIOCIDES QUESTION ORDER ===\n')

const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number, dependent_no_show, bubble_id')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

console.log('Current order in Supabase:\n')
questions?.forEach((q, idx) => {
  console.log(`Order ${q.order_number} (${q.dependent_no_show ? 'DEP' : 'IND'}): ${q.name}`)
  console.log(`  Bubble ID: ${q.bubble_id}`)
  console.log()
})

console.log('\n=== EXPECTED FROM BUBBLE (from your description) ===')
console.log('3.1.1: According to Regulation (EU) No. 528/2012...')
console.log('3.1.1.1: If yes, please specify...')
console.log('3.1.2: Are the biocidal active substances used for in-can preservation (PT 6)?')
console.log('3.1.3: Only applicable for EU suppliers! Is the supplier of the active substance...')
console.log('3.1.4: Are the biocidal active substances used as slimicides (PT 12)?')
console.log('3.1.5: Only applicable for EU suppliers! Is the supplier...')
console.log('3.1.6: Are the biocidal active substances used as Preservatives...')
console.log('3.1.7: Are the biocidal active substances listed in the Article 95 list...')
console.log('3.1.8: Only applicable for EU suppliers! Is the supplier...')

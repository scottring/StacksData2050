import { supabase } from './src/migration/supabase-client.js'

async function findHydrocarbSheet() {
  console.log('=== Finding HYDROCARB Sheet ===\n')

  // Search for HYDROCARB sheet
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, version_number')
    .ilike('name', '%HYDROCARB%')

  if (sheets && sheets.length > 0) {
    console.log(`Found ${sheets.length} HYDROCARB sheets:\n`)
    for (const sheet of sheets) {
      console.log(`${sheet.name}`)
      console.log(`  ID: ${sheet.id}`)
      console.log(`  Version: ${sheet.version_number}`)

      // Count questions for this sheet
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('parent_sheet_id', sheet.id)

      console.log(`  Questions: ${count}\n`)
    }

    // Use the v2 sheet
    const hydrocarbV2 = sheets.find(s => s.name?.includes('90-ME 78'))
    if (hydrocarbV2) {
      console.log(`\n=== Analyzing ${hydrocarbV2.name} ===\n`)

      // Get all questions
      const { data: questions } = await supabase
        .from('questions')
        .select('id, name, section_sort_number, subsection_sort_number, order_number')
        .eq('parent_sheet_id', hydrocarbV2.id)
        .order('section_sort_number', { ascending: true, nullsFirst: false })
        .order('subsection_sort_number', { ascending: true, nullsFirst: false })
        .order('order_number', { ascending: true })

      if (questions) {
        console.log(`Total questions: ${questions.length}\n`)

        // Group by section
        const bySection = new Map<number | null, any[]>()
        for (const q of questions) {
          const key = q.section_sort_number
          if (!bySection.has(key)) {
            bySection.set(key, [])
          }
          bySection.get(key)!.push(q)
        }

        console.log('Questions by section:')
        for (const [section, qs] of bySection) {
          if (section !== null) {
            console.log(`  Section ${section}: ${qs.length} questions`)
          } else {
            console.log(`  Section NULL: ${qs.length} questions`)
          }
        }

        // Show section 4 breakdown
        if (bySection.has(4)) {
          console.log('\n=== Section 4 Breakdown ===\n')
          const section4 = bySection.get(4)!

          const bySubsection = new Map<number | null, any[]>()
          for (const q of section4) {
            const key = q.subsection_sort_number
            if (!bySubsection.has(key)) {
              bySubsection.set(key, [])
            }
            bySubsection.get(key)!.push(q)
          }

          const sortedSubs = Array.from(bySubsection.keys()).sort((a, b) => {
            if (a === null) return 1
            if (b === null) return -1
            return a - b
          })

          for (const subNum of sortedSubs) {
            const subQuestions = bySubsection.get(subNum)!
            if (subNum === null) {
              console.log(`Subsection NULL: ${subQuestions.length} questions`)
            } else {
              console.log(`Subsection 4.${subNum}: ${subQuestions.length} questions`)
            }

            // Show first 3 questions
            for (const q of subQuestions.slice(0, 3)) {
              const questionNum = subNum !== null ? `4.${subNum}.${q.order_number}` : `4.?.${q.order_number}`
              console.log(`  ${questionNum}: ${q.name?.substring(0, 50)}`)
            }
            if (subQuestions.length > 3) {
              console.log(`  ... and ${subQuestions.length - 3} more`)
            }
            console.log()
          }
        }
      }
    }
  } else {
    console.log('No HYDROCARB sheets found')
  }
}

findHydrocarbSheet()

import { supabase } from './src/migration/supabase-client.js'

/**
 * Backfill sheet statuses based on:
 * 1. Migrated workflow data (comments, rejections)
 * 2. Activity data (modified_at timestamps)
 * 3. Answer completeness
 */

interface StatusStats {
  draft: number
  in_progress: number
  submitted: number
  needs_revision: number
  approved: number
  total: number
}

async function backfillSheetStatuses() {
  console.log('=== Backfilling Sheet Statuses ===\n')

  const stats: StatusStats = {
    draft: 0,
    in_progress: 0,
    submitted: 0,
    needs_revision: 0,
    approved: 0,
    total: 0
  }

  // Get all sheets (Supabase has a 1000 row limit by default, need to fetch ALL)
  console.log('Fetching all sheets...')

  // Fetch in batches to get all sheets
  let allSheets: any[] = []
  let from = 0
  const batchSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('sheets')
      .select('id, bubble_id, modified_at, created_at')
      .range(from, from + batchSize - 1)

    if (error) {
      console.error('Error fetching sheets:', error)
      return
    }

    if (data && data.length > 0) {
      allSheets = allSheets.concat(data)
      console.log(`  Fetched ${allSheets.length} sheets so far...`)

      if (data.length < batchSize) {
        hasMore = false
      } else {
        from += batchSize
      }
    } else {
      hasMore = false
    }
  }

  const sheets = allSheets
  console.log(`\nTotal sheets fetched: ${sheets.length}`)

  if (!sheets || sheets.length === 0) {
    console.log('No sheets found')
    return
  }

  console.log(`Processing ${sheets.length} sheets...\n`)
  stats.total = sheets.length

  for (const sheet of sheets) {
    let status = 'draft'  // Default

    // Check for answer rejections (means needs revision or was being reviewed)
    const { data: rejections } = await supabase
      .from('answer_rejections')
      .select('id, resolved')
      .eq('sheet_id', sheet.id)
      .limit(1)

    // Check for comments (indicates interaction/review)
    const { data: comments } = await supabase
      .from('comments')
      .select('id')
      .eq('parent_entity_id', sheet.id)
      .eq('parent_entity_type', 'sheet')
      .limit(1)

    // Check for answers
    const { count: answerCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    // Infer status based on available data
    if (rejections && rejections.length > 0) {
      // Has rejections - either needs revision or was already revised
      const hasUnresolved = rejections.some(r => !r.resolved)
      status = hasUnresolved ? 'needs_revision' : 'approved'
    } else if (comments && comments.length > 0) {
      // Has comments but no rejections - likely approved or in review
      // Check activity recency
      const modifiedDate = new Date(sheet.modified_at)
      const daysSinceModified = (Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceModified > 90) {
        status = 'approved'  // Old and has comments = likely completed
      } else {
        status = 'submitted'  // Recent with comments = under review
      }
    } else if (answerCount && answerCount > 0) {
      // Has answers but no workflow data
      const modifiedDate = new Date(sheet.modified_at)
      const daysSinceModified = (Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceModified > 90) {
        status = 'approved'  // Old with answers = likely completed
      } else if (daysSinceModified > 30) {
        status = 'submitted'  // Medium age = likely submitted
      } else {
        status = 'in_progress'  // Recent activity = still working
      }
    } else {
      // No answers = draft
      status = 'draft'
    }

    // Update the sheet
    const { error: updateError } = await supabase
      .from('sheets')
      .update({ new_status: status })
      .eq('id', sheet.id)

    if (updateError) {
      console.error(`Error updating sheet ${sheet.id}:`, updateError)
      continue
    }

    // Update stats
    stats[status as keyof StatusStats]++

    if (stats.total > 0 && (stats.draft + stats.in_progress + stats.submitted + stats.needs_revision + stats.approved) % 100 === 0) {
      const processed = stats.draft + stats.in_progress + stats.submitted + stats.needs_revision + stats.approved
      console.log(`Progress: ${processed}/${stats.total} sheets processed`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('STATUS BACKFILL COMPLETE')
  console.log('='.repeat(80))
  console.log(`Total sheets: ${stats.total}`)
  console.log(`\nStatus distribution:`)
  console.log(`  Draft:          ${stats.draft}`)
  console.log(`  In Progress:    ${stats.in_progress}`)
  console.log(`  Submitted:      ${stats.submitted}`)
  console.log(`  Needs Revision: ${stats.needs_revision}`)
  console.log(`  Approved:       ${stats.approved}`)
  console.log(`\nPercentages:`)
  console.log(`  Draft:          ${((stats.draft / stats.total) * 100).toFixed(1)}%`)
  console.log(`  In Progress:    ${((stats.in_progress / stats.total) * 100).toFixed(1)}%`)
  console.log(`  Submitted:      ${((stats.submitted / stats.total) * 100).toFixed(1)}%`)
  console.log(`  Needs Revision: ${((stats.needs_revision / stats.total) * 100).toFixed(1)}%`)
  console.log(`  Approved:       ${((stats.approved / stats.total) * 100).toFixed(1)}%`)
}

backfillSheetStatuses().catch(console.error)

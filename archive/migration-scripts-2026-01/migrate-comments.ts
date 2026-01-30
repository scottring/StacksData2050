import { supabase } from './src/migration/supabase-client.js'
import { recordMapping, getSupabaseId } from './src/migration/id-mapper.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!
const DRY_RUN = process.env.DRY_RUN === 'true'
const BATCH_SIZE = 100

interface MigrationStats {
  total: number
  inserted: number
  skipped: number
  errors: number
  startTime: Date
}

async function migrateComments() {
  const stats: MigrationStats = {
    total: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date()
  }

  console.log('=== Comment Migration from Bubble ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no actual inserts)' : 'LIVE MIGRATION'}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Started: ${stats.startTime.toISOString()}\n`)

  // Get total count first
  const countResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/comment`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const countData = await countResp.json() as any
  const totalComments = countData.response?.count || 0
  console.log(`Total comments in Bubble: ${totalComments}\n`)

  // Fetch all comments with pagination
  let cursor = 0
  let hasMore = true
  const allComments: any[] = []

  console.log('Fetching comments from Bubble...')
  while (hasMore) {
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/comment?cursor=${cursor}&limit=100`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (!data.response?.results) {
      console.log(`⚠️  No results at cursor ${cursor}`)
      break
    }

    const comments = data.response.results
    allComments.push(...comments)

    console.log(`  Fetched ${allComments.length}/${totalComments} comments...`)

    if (comments.length < 100 || data.response.remaining === 0) {
      hasMore = false
    } else {
      cursor += 100
    }
  }

  console.log(`\n✓ Fetched ${allComments.length} comments from Bubble\n`)
  console.log('=' .repeat(80))

  stats.total = allComments.length

  // Process comments in batches
  for (let i = 0; i < allComments.length; i += BATCH_SIZE) {
    const batch = allComments.slice(i, i + BATCH_SIZE)
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allComments.length / BATCH_SIZE)} (${batch.length} comments)`)

    for (const bubbleComment of batch) {
      try {
        // Check if already migrated
        const existingId = await getSupabaseId(bubbleComment._id, 'comment')
        if (existingId) {
          stats.skipped++
          continue
        }

        // Map foreign keys
        const questionId = await getSupabaseId(bubbleComment.Question, 'question')
        const createdBy = await getSupabaseId(bubbleComment['Created By'], 'user')

        // Determine parent entity (could be answer or sheet)
        // Bubble comments have a Question field which we'll map to parent_entity_id
        // and set parent_entity_type based on context
        let parentEntityId = questionId
        let parentEntityType = 'question'  // Default to question for now

        if (!parentEntityId) {
          console.log(`  ⚠️  Comment ${bubbleComment._id} has no valid parent - skipping`)
          stats.skipped++
          continue
        }

        const commentData = {
          bubble_id: bubbleComment._id,
          content: bubbleComment.Message || '',
          comment_type: 'review',  // Assuming most are review comments
          parent_entity_type: parentEntityType,
          parent_entity_id: parentEntityId,
          created_by: createdBy,
          created_at: bubbleComment['Created Date'],
          modified_at: bubbleComment['Modified Date']
        }

        if (!DRY_RUN) {
          const { data, error } = await supabase
            .from('comments')
            .insert(commentData)
            .select('id')
            .single()

          if (error) {
            console.log(`  ❌ Error inserting comment ${bubbleComment._id}: ${error.message}`)
            stats.errors++
            continue
          }

          // Save ID mapping
          await recordMapping(bubbleComment._id, data.id, 'comment')
        }

        stats.inserted++

        if (stats.inserted % 100 === 0) {
          console.log(`  Progress: ${stats.inserted} inserted, ${stats.skipped} skipped, ${stats.errors} errors`)
        }

      } catch (error: any) {
        console.log(`  ❌ Error processing comment ${bubbleComment._id}: ${error.message}`)
        stats.errors++
      }
    }
  }

  // Summary
  const duration = (new Date().getTime() - stats.startTime.getTime()) / 1000
  console.log('\n' + '='.repeat(80))
  console.log('MIGRATION COMPLETE')
  console.log('='.repeat(80))
  console.log(`Duration: ${duration.toFixed(1)}s`)
  console.log(`Total: ${stats.total}`)
  console.log(`Inserted: ${stats.inserted}`)
  console.log(`Skipped: ${stats.skipped}`)
  console.log(`Errors: ${stats.errors}`)

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No data was actually inserted')
  }
}

migrateComments().catch(console.error)

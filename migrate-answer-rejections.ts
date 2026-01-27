import { supabase } from './src/migration/supabase-client.js'
import { recordMapping, getSupabaseId } from './src/migration/id-mapper.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!
const DRY_RUN = process.env.DRY_RUN === 'true'
const BATCH_SIZE = 50

interface MigrationStats {
  total: number
  inserted: number
  skipped: number
  errors: number
  startTime: Date
}

async function migrateAnswerRejections() {
  const stats: MigrationStats = {
    total: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date()
  }

  console.log('=== Answer Rejection Migration from Bubble ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no actual inserts)' : 'LIVE MIGRATION'}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log(`Started: ${stats.startTime.toISOString()}\n`)

  // Get total count first
  const countResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/answer_rejection`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const countData = await countResp.json() as any
  const totalRejections = countData.response?.count || 0
  console.log(`Total answer_rejections in Bubble: ${totalRejections}\n`)

  // Fetch all answer_rejections with pagination
  let cursor = 0
  let hasMore = true
  const allRejections: any[] = []

  console.log('Fetching answer_rejections from Bubble...')
  while (hasMore) {
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer_rejection?cursor=${cursor}&limit=100`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (!data.response?.results) {
      console.log(`⚠️  No results at cursor ${cursor}`)
      break
    }

    const rejections = data.response.results
    allRejections.push(...rejections)

    console.log(`  Fetched ${allRejections.length}/${totalRejections} answer_rejections...`)

    if (rejections.length < 100 || data.response.remaining === 0) {
      hasMore = false
    } else {
      cursor += 100
    }
  }

  console.log(`\n✓ Fetched ${allRejections.length} answer_rejections from Bubble\n`)
  console.log('=' .repeat(80))

  stats.total = allRejections.length

  // Process rejections in batches
  for (let i = 0; i < allRejections.length; i += BATCH_SIZE) {
    const batch = allRejections.slice(i, i + BATCH_SIZE)
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allRejections.length / BATCH_SIZE)} (${batch.length} rejections)`)

    for (const bubbleRejection of batch) {
      try {
        // Map foreign keys
        const answerId = await getSupabaseId(bubbleRejection.Answer, 'answer')
        const sheetId = await getSupabaseId(bubbleRejection.Sheet, 'sheet')
        const rejectedBy = await getSupabaseId(bubbleRejection['Created By'], 'user')
        const companyId = await getSupabaseId(bubbleRejection.Company, 'company')

        if (!answerId) {
          console.log(`  ⚠️  Rejection ${bubbleRejection._id} has no valid answer - skipping`)
          stats.skipped++
          continue
        }

        if (!sheetId) {
          console.log(`  ⚠️  Rejection ${bubbleRejection._id} has no valid sheet - skipping`)
          stats.skipped++
          continue
        }

        const rejectionData = {
          bubble_id: bubbleRejection._id,
          answer_id: answerId,
          sheet_id: sheetId,
          rejected_by: rejectedBy,
          reason: bubbleRejection.Reason || '',
          created_at: bubbleRejection['Created Date']
        }

        if (!DRY_RUN) {
          const { error } = await supabase
            .from('answer_rejections')
            .insert(rejectionData)

          if (error) {
            console.log(`  ❌ Error inserting rejection ${bubbleRejection._id}: ${error.message}`)
            stats.errors++
            continue
          }
        }

        stats.inserted++

        if (stats.inserted % 50 === 0) {
          console.log(`  Progress: ${stats.inserted} inserted, ${stats.skipped} skipped, ${stats.errors} errors`)
        }

      } catch (error: any) {
        console.log(`  ❌ Error processing rejection ${bubbleRejection._id}: ${error.message}`)
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

migrateAnswerRejections().catch(console.error)

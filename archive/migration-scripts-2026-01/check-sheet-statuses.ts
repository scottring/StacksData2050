import { supabase } from './src/migration/supabase-client.js'

async function checkStatuses() {
  console.log('Checking sheet statuses...\n')

  // Total sheets
  const { count } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })

  console.log(`Total sheets in database: ${count}\n`)

  // Get all statuses (use pagination to get all sheets)
  let allData: any[] = []
  let from = 0
  const batchSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('sheets')
      .select('new_status')
      .range(from, from + batchSize - 1)

    if (error) {
      console.error('Error fetching sheets:', error)
      break
    }

    if (data && data.length > 0) {
      allData = allData.concat(data)
      if (data.length < batchSize) {
        hasMore = false
      } else {
        from += batchSize
      }
    } else {
      hasMore = false
    }
  }

  const data = allData

  if (!data) {
    console.log('No data found')
    return
  }

  // Count by status
  const statusCounts: Record<string, number> = {}
  data.forEach(s => {
    const status = s.new_status || 'NULL'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })

  console.log('Status distribution:')
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const pct = ((count / data.length) * 100).toFixed(1)
      console.log(`  ${status.padEnd(20)} ${count.toString().padStart(5)} (${pct}%)`)
    })
}

checkStatuses().catch(console.error)

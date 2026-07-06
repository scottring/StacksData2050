/**
 * Fetch Company Logos Script
 *
 * This script fetches logos for companies using Google's Favicon service.
 * Falls back to checking multiple domain variations.
 *
 * Usage: npx tsx fetch-company-logos.ts
 */

import { supabase } from './src/migration/supabase-client.js'

interface Company {
  id: string
  name: string
  logo_url: string | null
}

// Try to derive domains from company name
function getDomainFromName(name: string): string[] {
  const domains: string[] = []

  // Clean the name - remove common suffixes
  const cleaned = name
    .toLowerCase()
    .replace(/\s+(inc|llc|ltd|corp|corporation|gmbh|ag|sa|bv|nv|co|company|oy|ab|srl|spa|s\.a\.|s\.p\.a|kg)\.?$/i, '')
    .trim()

  // Try variations:
  // 1. Name as-is with .com
  const simple = cleaned.replace(/[^a-z0-9]/g, '')
  if (simple.length > 2) {
    domains.push(`${simple}.com`)
  }

  // 2. Name with hyphens for spaces
  const hyphenated = cleaned.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (hyphenated.length > 2 && hyphenated !== simple) {
    domains.push(`${hyphenated}.com`)
  }

  // 3. First word only (often the main brand)
  const firstWord = cleaned.split(/\s+/)[0].replace(/[^a-z0-9]/g, '')
  if (firstWord.length > 2 && firstWord !== simple) {
    domains.push(`${firstWord}.com`)
  }

  // 4. Try other TLDs for European companies
  if (simple.length > 2) {
    domains.push(`${simple}.de`)
    domains.push(`${simple}.eu`)
    domains.push(`${simple}.fi`)
    domains.push(`${simple}.nl`)
    domains.push(`${simple}.fr`)
    domains.push(`${simple}.it`)
  }

  return domains
}

// Check if a Google Favicon URL returns a valid (non-default) icon
async function checkFaviconExists(domain: string): Promise<boolean> {
  // Google's favicon service URL with 128px size
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  try {
    const response = await fetch(url)
    if (!response.ok) return false

    // Check content length - default globe icon is usually very small
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) < 1000) {
      // Small icon likely means default/placeholder
      return false
    }

    return true
  } catch {
    return false
  }
}

async function fetchCompanyLogos() {
  console.log('Fetching companies without logos...\n')

  // Fetch companies without logos
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .is('logo_url', null)
    .order('name')

  if (error) {
    console.error('Error fetching companies:', error)
    return
  }

  if (!companies || companies.length === 0) {
    console.log('All companies already have logos!')
    return
  }

  console.log(`Found ${companies.length} companies without logos\n`)

  let updated = 0
  let skipped = 0
  const failed: string[] = []

  for (const company of companies as Company[]) {
    const domainsToTry = getDomainFromName(company.name)

    let logoUrl: string | null = null

    for (const domain of domainsToTry) {
      const exists = await checkFaviconExists(domain)
      if (exists) {
        // Use Google's favicon service URL directly
        logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
        break
      }
    }

    if (logoUrl) {
      // Update company with logo URL
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: logoUrl })
        .eq('id', company.id)

      if (updateError) {
        console.error(`Failed to update ${company.name}:`, updateError)
        failed.push(company.name)
      } else {
        console.log(`✓ ${company.name} -> ${logoUrl}`)
        updated++
      }
    } else {
      console.log(`✗ ${company.name} - No logo found`)
      skipped++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log('\n--- Summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped (no logo found): ${skipped}`)
  console.log(`Failed: ${failed.length}`)
  if (failed.length > 0) {
    console.log('Failed companies:', failed.join(', '))
  }
}

fetchCompanyLogos().catch(console.error)

/**
 * Seed a complete, bulletproof "supplier sheet request" walk-through for demos.
 *
 * Builds the full lifecycle with NO dependency on the (currently broken) request
 * dialog and NO real supplier data:
 *   Dev Customer Co  --request-->  Dev Supplier Co
 *   Product: fictional "BarrierCote BC-410" grease-resistant food-packaging coating
 *   Questionnaire: HQ2.1, filled with sensible synthetic answers, status submitted.
 *
 * Idempotent: deletes any prior demo sheet of the same name first.
 * Run:  npx tsx seed-supplier-request-demo.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const g = (f: string, k: string) =>
  (fs.readFileSync(f, 'utf8').match(new RegExp(`(?:NEXT_PUBLIC_)?${k}=([^\\n\\r]+)`)) || [])[1]?.trim() || ''
const db = createClient(
  g('web/.env.local', 'SUPABASE_URL'),
  (fs.readFileSync('.env', 'utf8').match(/SERVICE_ROLE_KEY=([^\n\r]+)/) || [])[1]?.trim()!
)

// --- fixed dev IDs ---
const CUSTOMER = 'aada3dc9-5fb7-4443-9c53-322ceb990dfa' // Dev Customer Co
const SUPPLIER = 'f7e3432d-33d1-46ac-84dd-95647502cd32' // Dev Supplier Co
const HQ21 = 'a3fbb37e-cace-4aae-85c1-a2571e539e81' // HQ2.1 tag
const SUPPLIER_USER = '18e1ef59-c137-4482-9465-529358e19f7d' // supplier@devsupplier.test
const SCOTT = '1c19c889-1aef-4559-9fa0-57c2765e750d' // scott (customer side)
const PRODUCT = 'BarrierCote BC-410 — Grease-Resistant Food-Packaging Coating'

// Tailored fictional text answers keyed by question content substring.
const TEXT_ANSWERS: Array<[RegExp, string]> = [
  [/product description|chemical characterization/i,
    'Aqueous styrene-acrylate dispersion engineered as a grease- and oil-resistant functional barrier coating for paper and board food packaging. Solids 42%, pH 7.5, non-fluorinated.'],
  [/product code|reference/i, 'BC-410'],
  [/function in application/i,
    'Grease and oil resistance (Kit 7+) barrier layer applied to the food-contact side of paperboard by blade or rod coating, typical coat weight 4–8 g/m².'],
  [/producer/i, 'Dev Supplier Co'],
  [/production site/i, 'Dev Supplier Co — Coating Plant 2, Ghent, Belgium'],
  [/disclaimer/i,
    'Information is provided in good faith based on the current formulation. Refer to the latest technical data sheet for binding specifications.'],
  [/general limitation/i,
    'Suitable for dry and fatty foods at ambient and refrigerated temperatures. Not validated for direct contact with high-moisture foods above 60°C.'],
]
const fallbackText = 'Confirmed in accordance with the current product specification.'

function pickChoice(qContent: string, choices: { id: string; content: string; order_number: number }[]) {
  const lc = choices.map((c) => ({ c, t: (c.content || '').toLowerCase() }))
  const find = (re: RegExp) => lc.find((x) => re.test(x.t))?.c
  const q = (qContent || '').toLowerCase()
  const negative = /contain|contains|present|use of|used as|svhc|hazardous|biocid|restricted|substance of|intentionally added/.test(q)
  if (negative) {
    const no = find(/^no\b|does not|no,|absence|not present|free of|none|without/)
    if (no) return no
  }
  const yes = find(/^yes\b|meets|compl(y|ies|iant)|conform|available on request|in conformity|fulfil|positive/)
  if (yes) return yes
  const na = find(/not applicable|^n\/?a\b/)
  if (na) return na
  return choices.slice().sort((a, b) => (a.order_number ?? 99) - (b.order_number ?? 99))[0]
}

async function main() {
  console.log('Seeding supplier-request walk-through demo...\n')

  // 1. Clean up any prior run (by product name)
  const { data: priorSheets } = await db.from('sheets').select('id').eq('name', PRODUCT)
  for (const s of priorSheets || []) {
    const { data: pr } = await db.from('requests').select('id').eq('sheet_id', s.id)
    for (const r of pr || []) await db.from('request_tags').delete().eq('request_id', r.id)
    await db.from('requests').delete().eq('sheet_id', s.id)
    await db.from('answers').delete().eq('sheet_id', s.id)
    await db.from('sheet_tags').delete().eq('sheet_id', s.id)
    await db.from('sheets').delete().eq('id', s.id)
  }
  if (priorSheets?.length) console.log(`  cleaned ${priorSheets.length} prior demo sheet(s)`)

  // 2. Create the sheet (owned by supplier, requested by customer, submitted)
  const { data: sheet, error: se } = await db
    .from('sheets')
    .insert({
      name: PRODUCT,
      company_id: SUPPLIER,
      requesting_company_id: CUSTOMER,
      status: 'submitted',
      created_by: SUPPLIER_USER,
    })
    .select()
    .single()
  if (se) throw se
  console.log('  sheet:', sheet.id)

  // 3. sheet_tags + request + request_tags
  await db.from('sheet_tags').insert({ sheet_id: sheet.id, tag_id: HQ21 })
  const { data: request, error: re } = await db
    .from('requests')
    .insert({
      sheet_id: sheet.id,
      requestor_id: CUSTOMER,
      requesting_from_id: SUPPLIER,
      processed: false,
      created_by: SCOTT,
    })
    .select()
    .single()
  if (re) throw re
  await db.from('request_tags').insert({ request_id: request.id, tag_id: HQ21 })
  console.log('  request:', request.id)

  // 4. Gather HQ2.1 questions
  const { data: qts } = await db.from('question_tags').select('question_id').eq('tag_id', HQ21)
  const qids = [...new Set((qts || []).map((q) => q.question_id))]
  const questions: any[] = []
  for (let i = 0; i < qids.length; i += 100) {
    const { data } = await db.from('questions').select('id,content,name,response_type').in('id', qids.slice(i, i + 100))
    questions.push(...(data || []))
  }

  // 5. Build answers
  const answers: any[] = []
  let textCount = 0, choiceCount = 0, skipped = 0
  for (const q of questions) {
    const rt = (q.response_type || '').toLowerCase()
    const content = q.content || q.name || ''
    const base = { sheet_id: sheet.id, question_id: q.id, company_id: SUPPLIER, created_by: SUPPLIER_USER }
    if (/text line|text lines|single text|multiple text/.test(rt)) {
      const match = TEXT_ANSWERS.find(([re]) => re.test(content))
      answers.push({ ...base, text_value: match ? match[1] : fallbackText })
      textCount++
    } else if (/radio|dropdown|select one$/.test(rt)) {
      const { data: ch } = await db
        .from('choices')
        .select('id,content,order_number')
        .eq('question_id', q.id)
        .order('order_number')
      if (ch && ch.length > 0) {
        const choice = pickChoice(content, ch as any)
        answers.push({ ...base, choice_id: choice.id })
        choiceCount++
      } else {
        skipped++
      }
    } else {
      skipped++ // list tables, files, multi-select: left blank (normal)
    }
  }

  // 6. Insert answers in batches
  for (let i = 0; i < answers.length; i += 200) {
    const { error } = await db.from('answers').insert(answers.slice(i, i + 200))
    if (error) throw error
  }

  console.log(`\nDone.`)
  console.log(`  HQ2.1 questions: ${questions.length}`)
  console.log(`  text answers: ${textCount}`)
  console.log(`  choice answers: ${choiceCount}`)
  console.log(`  left blank (list tables/files/etc): ${skipped}`)
  console.log(`  total answers inserted: ${answers.length}`)
  console.log(`\n  Product: ${PRODUCT}`)
  console.log(`  Sheet id: ${sheet.id}`)
  console.log(`  Customer review URL: /sheets/${sheet.id}/review`)
  console.log(`  Supplier edit URL:   /sheets/${sheet.id}/edit`)
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1) })

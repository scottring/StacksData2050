/**
 * Pulls a calibration corpus of real supplier PDFs from PROD storage (READ-ONLY).
 * Downloads up to LIMIT PDFs from the answer-files bucket into calibration/corpus/.
 * Run from stacks/web:
 *   npx tsx scripts/pull-calibration-corpus.ts
 * Prod credentials are read from ../.env.production explicitly; nothing is written to prod.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const LIMIT = 40

function parseEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

function guessType(name: string): 'sds' | 'other' {
  return /\b(sds|safety.?data|msds)\b/i.test(name) ? 'sds' : 'other'
}

async function main() {
  const prod = parseEnv(resolve('../.env.production'))
  const sb = createClient(prod.SUPABASE_URL, prod.SUPABASE_SERVICE_ROLE_KEY)
  const corpusDir = resolve('calibration/corpus')
  mkdirSync(corpusDir, { recursive: true })

  const { data: folders, error } = await sb.storage.from('answer-files').list('', { limit: 300 })
  if (error) throw new Error(`list failed: ${error.message}`)

  const manifest: Array<{ localFile: string; sizeBytes: number; guessedType: string }> = []
  let index = 0

  for (const folder of folders ?? []) {
    if (manifest.length >= LIMIT) break
    const { data: files } = await sb.storage.from('answer-files').list(`${folder.name}/support_file`, { limit: 3 })
    for (const file of files ?? []) {
      if (manifest.length >= LIMIT) break
      if (file.metadata?.mimetype !== 'application/pdf') continue
      if ((file.metadata?.size ?? 0) > 15_000_000) continue // matches process.ts base64 guard
      const remotePath = `${folder.name}/support_file/${file.name}`
      const { data: blob, error: dlErr } = await sb.storage.from('answer-files').download(remotePath)
      if (dlErr || !blob) {
        console.error(`skip ${remotePath}: ${dlErr?.message}`)
        continue
      }
      index += 1
      const localName = `${String(index).padStart(3, '0')}_${file.name.replace(/[^\w.\-]/g, '_')}`
      const localPath = join(corpusDir, localName)
      if (!existsSync(localPath)) {
        writeFileSync(localPath, Buffer.from(await blob.arrayBuffer()))
      }
      manifest.push({ localFile: localName, sizeBytes: file.metadata?.size ?? 0, guessedType: guessType(file.name) })
      console.log(`pulled ${localName} (${Math.round((file.metadata?.size ?? 0) / 1024)}KB, ${guessType(file.name)})`)
    }
  }

  writeFileSync(resolve('calibration/corpus-manifest.json'), JSON.stringify(manifest, null, 2))
  const sdsCount = manifest.filter((m) => m.guessedType === 'sds').length
  console.log(`\nCorpus: ${manifest.length} PDFs (${sdsCount} sds, ${manifest.length - sdsCount} other)`)
  if (manifest.length < 20) {
    console.error('Fewer than 20 documents pulled; raise the folder list limit and rerun.')
    process.exit(1)
  }
}

main()

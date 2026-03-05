import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN as string;
const testUrl = 'https://app.stacksdata.com/fileupload/f1636465096133x672862057458105500/STEROCOLLFS_30070931_SDS_GEN_DE_DE_6-0_D051.PDF';

async function tryDownload(label: string, url: string, headers: Record<string, string> = {}) {
  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    const contentType = res.headers.get('content-type');
    const contentLen = res.headers.get('content-length');
    console.log(`${label}: ${res.status} ${res.statusText} | type=${contentType} | size=${contentLen}`);
    if (res.status === 302 || res.status === 301) {
      console.log(`  Redirect: ${res.headers.get('location')}`);
    }
    if (res.ok && contentLen && parseInt(contentLen) > 100) {
      console.log(`  SUCCESS — file is downloadable`);
    }
  } catch (e: any) {
    console.log(`${label}: ERROR ${e.message}`);
  }
}

async function main() {
  console.log(`Token: ${BUBBLE_API_TOKEN.slice(0, 10)}...\n`);

  // Try various auth approaches
  await tryDownload('1. No auth', testUrl);
  await tryDownload('2. Bearer token', testUrl, { Authorization: `Bearer ${BUBBLE_API_TOKEN}` });
  await tryDownload('3. Cookie', testUrl, { Cookie: `bubble_session=${BUBBLE_API_TOKEN}` });

  const sep = testUrl.includes('?') ? '&' : '?';
  await tryDownload('4. Query param', `${testUrl}${sep}api_token=${BUBBLE_API_TOKEN}`);
  await tryDownload('5. X-Bubble-Token', testUrl, { 'X-Bubble-Token': BUBBLE_API_TOKEN });

  // Try the version-live URL variant
  const altUrl = testUrl.replace('app.stacksdata.com/fileupload/', 'app.stacksdata.com/version-live/fileupload/');
  await tryDownload('6. version-live path', altUrl);
  await tryDownload('7. version-live + Bearer', altUrl, { Authorization: `Bearer ${BUBBLE_API_TOKEN}` });

  // Try S3 direct (Bubble usually stores in S3)
  // The Bubble file format: f{timestamp}x{random}/{filename}
  // S3 bucket might be: s3.amazonaws.com/appdata.bubble.io/...
  const s3Url = `https://s3.amazonaws.com/appdata.bubble.io/f1636465096133x672862057458105500/STEROCOLLFS_30070931_SDS_GEN_DE_DE_6-0_D051.PDF`;
  await tryDownload('8. S3 direct guess', s3Url);

  // Try via Bubble API file endpoint
  const apiUrl = `https://app.stacksdata.com/version-live/api/1.1/obj/file/f1636465096133x672862057458105500`;
  await tryDownload('9. API file endpoint', apiUrl, { Authorization: `Bearer ${BUBBLE_API_TOKEN}` });
}

main().catch(err => { console.error(err); process.exit(1); });

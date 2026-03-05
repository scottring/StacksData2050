import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Try various document_type values to find what the check constraint allows
  const testValues = [null, 'file', 'support_file', 'sds', 'certificate', 'declaration', 'other', 'SDS', 'CERTIFICATE', 'DECLARATION', 'OTHER'];

  for (const val of testValues) {
    const { error } = await supabase
      .from('answer_documents')
      .insert({
        file_url: 'https://test.example.com/test.pdf',
        document_type: val,
        filename: 'test.pdf',
      });

    if (error) {
      if (error.message.includes('check constraint')) {
        console.log(`document_type="${val}": REJECTED (check constraint)`);
      } else {
        console.log(`document_type="${val}": ERROR: ${error.message}`);
      }
    } else {
      console.log(`document_type="${val}": ACCEPTED`);
      // Clean up
      await supabase.from('answer_documents').delete().eq('file_url', 'https://test.example.com/test.pdf');
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });

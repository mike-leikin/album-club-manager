// scripts/execute-migration.ts
// Executes SQL migration directly against Supabase using the REST API

import * as fs from 'fs';
import * as path from 'path';
import { createServerClient } from '../lib/supabaseClient';

async function main() {
  console.log('🚀 Executing Supabase Migration\n');

  const migrationFile = process.argv[2] || 'supabase/migrations/002_add_album_artwork_urls.sql';
  const fullPath = path.join(process.cwd(), migrationFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Migration file not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf-8');

  console.log('📄 Migration file:', migrationFile);
  console.log('📏 SQL size:', sql.length, 'characters\n');

  try {
    const supabase = createServerClient();

    console.log('⚙️  Executing migration...\n');

    // Execute the SQL using Supabase's RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('\nNote: The Supabase JS client cannot execute raw DDL statements.');
      console.error('You need to run this migration manually in the Supabase SQL Editor.\n');
      console.error('Run: npm run migration:show');
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!');
    if (data) {
      console.log('Result:', data);
    }

    // Verify the columns were added
    console.log('\n🔍 Verifying columns...\n');
    const { data: columns, error: verifyError } = await supabase
      .from('weeks')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('⚠️  Could not verify:', verifyError.message);
    } else {
      console.log('✅ Weeks table structure verified!');
      if (columns && columns.length > 0) {
        const sample = columns[0];
        const hasContemporary = 'contemporary_album_art_url' in sample;
        const hasClassic = 'classic_album_art_url' in sample;

        console.log('   - contemporary_album_art_url:', hasContemporary ? '✓' : '✗');
        console.log('   - classic_album_art_url:', hasClassic ? '✓' : '✗');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    console.error('\nThe Supabase JS client cannot execute DDL statements (ALTER TABLE).');
    console.error('Please run the migration manually using: npm run migration:show\n');
    process.exit(1);
  }
}

main();

// scripts/run-migration.ts
// Runs SQL migrations against Supabase
// NOTE: Supabase JS client cannot execute raw SQL for security reasons.
// This script prints the migration file path and instructions.

import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Supabase Migration Helper\n');

  const migrationFile = process.argv[2] || 'supabase/migrations/002_add_album_artwork_urls.sql';
  const fullPath = path.join(process.cwd(), migrationFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Migration file not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf-8');

  console.log('📄 Migration file:', migrationFile);
  console.log('📏 Size:', sql.length, 'characters\n');

  console.log('📋 TO RUN THIS MIGRATION:\n');
  console.log('1. Go to your Supabase dashboard:');
  console.log('   https://supabase.com/dashboard/project/houteunrytkvhrmagjrg\n');
  console.log('2. Navigate to: SQL Editor (left sidebar)\n');
  console.log('3. Click "New Query"\n');
  console.log('4. Copy the SQL from:', fullPath);
  console.log('   (Or copy from the output below)\n');
  console.log('5. Paste into the SQL editor and click "Run"\n');

  console.log('─'.repeat(80));
  console.log('SQL TO EXECUTE:');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('\n✅ Copy the SQL above and run it in the Supabase SQL Editor');
}

main();

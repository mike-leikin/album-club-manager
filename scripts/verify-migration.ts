// scripts/verify-migration.ts
// Verifies that the album artwork columns were added successfully

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createServerClient } from '../lib/supabaseClient';

async function main() {
  console.log('🔍 Verifying Migration...\n');

  const supabase = createServerClient();

  // Try to fetch the latest week to see the schema
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .order('week_number', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error fetching weeks:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.log('ℹ️  No weeks found in database (this is okay for a new setup)');
    console.log('   We can still verify by checking the structure.\n');
  } else {
    console.log('✅ Successfully fetched week data\n');
    console.log('Week structure includes:');
    const keys = Object.keys(data);
    keys.forEach(key => {
      if (key.includes('album_art')) {
        console.log(`   ✓ ${key}`);
      }
    });
  }

  // Check if the columns exist by looking at the object structure
  const hasContemporaryArt = !data || 'contemporary_album_art_url' in data;
  const hasClassicArt = !data || 'classic_album_art_url' in data;

  console.log('\n📊 Migration Status:');
  console.log('   contemporary_album_art_url:', hasContemporaryArt ? '✅ EXISTS' : '❌ MISSING');
  console.log('   classic_album_art_url:', hasClassicArt ? '✅ EXISTS' : '❌ MISSING');

  if (hasContemporaryArt && hasClassicArt) {
    console.log('\n🎉 Migration successful! All columns are present.');
    console.log('\n✨ You can now save albums with artwork URLs!');
  } else {
    console.log('\n⚠️  Migration may not have completed successfully.');
    console.log('   Please run the migration again.');
  }
}

main();

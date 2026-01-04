// Quick script to check Ray Charles albums in database
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
});

import('@supabase/supabase-js').then(async ({ createClient }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking Ray Charles albums in database...\n');

  const { data, error } = await supabase
    .from('rs_500_albums')
    .select('*')
    .ilike('artist', '%Ray Charles%')
    .order('rank');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No Ray Charles albums found in database');
    process.exit(0);
  }

  console.log(`Found ${data.length} Ray Charles album(s):\n`);

  for (const album of data) {
    console.log('='.repeat(80));
    console.log(`Rank: #${album.rank}`);
    console.log(`Artist: ${album.artist}`);
    console.log(`Album: ${album.album}`);
    console.log(`Year: ${album.year}`);
    console.log(`Spotify URL: ${album.spotify_url || 'Not found'}`);
    console.log(`Album Art: ${album.album_art_url || 'Not found'}`);
    console.log(`Already Covered: ${album.already_covered ? 'Yes' : 'No'}`);
    console.log('='.repeat(80));
    console.log('');
  }

  process.exit(0);
});

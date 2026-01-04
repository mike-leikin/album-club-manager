// scripts/fix-ray-charles-album.ts
// Fix the Ray Charles album art for "Modern Sounds in Country and Western Music"

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables FIRST
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Import spotifyClient after env is loaded
import { spotifyClient } from '../lib/spotifyClient';

// Create Supabase client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🎸 Fixing Ray Charles Album Art\n');

  // Find the Ray Charles album in the database
  const { data: album, error: fetchError } = await supabase
    .from('rs_500_albums')
    .select('*')
    .ilike('artist', '%Ray Charles%')
    .ilike('album', '%Modern Sounds%')
    .single();

  if (fetchError || !album) {
    console.error('❌ Album not found in database');
    console.error(fetchError);
    process.exit(1);
  }

  console.log('📀 Current album data:');
  console.log(`   Rank: ${album.rank}`);
  console.log(`   Artist: ${album.artist}`);
  console.log(`   Album: ${album.album}`);
  console.log(`   Year: ${album.year}`);
  console.log(`   Current Spotify URL: ${album.spotify_url}`);
  console.log(`   Current Album Art: ${album.album_art_url}`);

  // Search Spotify with more specific query
  console.log('\n🔍 Searching Spotify for the correct album...');

  const searchQuery = `album:"Modern Sounds in Country and Western Music" artist:"Ray Charles"`;
  console.log(`   Query: ${searchQuery}`);

  const results = await spotifyClient.searchAlbums(searchQuery, 10);

  console.log(`\n📊 Found ${results.length} results:\n`);

  results.forEach((result, index) => {
    const year = parseInt(result.release_date.split('-')[0]);
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   Artist: ${result.artists.map(a => a.name).join(', ')}`);
    console.log(`   Year: ${year}`);
    console.log(`   Type: ${result.album_type}`);
    console.log(`   URL: ${result.external_urls.spotify}`);
    console.log(`   Image: ${result.images[0]?.url || 'No image'}`);
    console.log('');
  });

  // Find best match - prioritize year 1962 and album type
  const bestMatch = results.find(r => {
    const spotifyYear = parseInt(r.release_date.split('-')[0]);
    const isCorrectYear = spotifyYear === 1962;
    const isAlbum = r.album_type === 'album';
    return isCorrectYear && isAlbum;
  }) || results[0];

  if (!bestMatch) {
    console.error('❌ No suitable match found');
    process.exit(1);
  }

  console.log('✅ Best match selected:');
  console.log(`   ${bestMatch.name} (${bestMatch.release_date.split('-')[0]})`);
  console.log(`   URL: ${bestMatch.external_urls.spotify}`);
  console.log(`   Image: ${bestMatch.images[0]?.url}`);

  // Update the database
  console.log('\n📝 Updating database...');

  const { error: updateError } = await supabase
    .from('rs_500_albums')
    .update({
      spotify_id: bestMatch.id,
      spotify_url: bestMatch.external_urls.spotify,
      album_art_url: bestMatch.images[0]?.url || null,
    })
    .eq('rank', album.rank);

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    process.exit(1);
  }

  console.log('✅ Album art updated successfully!');
  console.log('\n💡 You can now use the RS 500 picker to select this album with the correct cover art.');
}

main().catch(console.error);

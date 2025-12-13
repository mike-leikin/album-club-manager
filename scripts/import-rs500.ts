// scripts/import-rs500.ts
// Imports Rolling Stone 500 albums from CSV and enriches with Spotify data

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables BEFORE importing other modules
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Now import after env is loaded
import { createServerClient } from '../lib/supabaseClient';
import { spotifyClient } from '../lib/spotifyClient';

interface CSVRow {
  Ranking: string;
  Artist: string;
  Album: string;
  Year: string;
  Nathan?: string;
  Mike?: string;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Parse header
  const header = lines[0].split(',');

  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: any = {};

    header.forEach((key, index) => {
      row[key.trim()] = values[index]?.trim() || '';
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎸 Rolling Stone 500 Import Tool\n');

  const csvPath = process.argv[2] || '/Users/mikeleikin/Downloads/rolling_stone_list.csv';

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.log('\nUsage: npm run import:rs500 [path/to/csv]');
    process.exit(1);
  }

  console.log('📄 Reading CSV file:', csvPath);
  const rows = parseCSV(csvPath);
  console.log(`✅ Found ${rows.length} albums\n`);

  const supabase = createServerClient();

  let imported = 0;
  let enriched = 0;
  let alreadyCovered = 0;
  let errors = 0;

  for (const row of rows) {
    const rank = parseInt(row.Ranking);
    const artist = row.Artist;
    const album = row.Album;
    const year = parseInt(row.Year);
    const mikeRating = row.Mike;

    // Check if already covered (Mike has a rating)
    const wasCovered = mikeRating && mikeRating.trim() !== '';

    console.log(`[${rank}/${rows.length}] ${album} - ${artist} (${year})${wasCovered ? ' [COVERED]' : ''}`);

    try {
      // Search Spotify for the album
      const searchQuery = `${album} ${artist}`;
      let spotifyData = null;

      try {
        const results = await spotifyClient.searchAlbums(searchQuery, 3);

        if (results.length > 0) {
          // Try to find best match by year or just take first result
          const match = results.find(r => {
            const spotifyYear = parseInt(r.release_date.split('-')[0]);
            return Math.abs(spotifyYear - year) <= 2; // Within 2 years
          }) || results[0];

          spotifyData = {
            spotify_id: match.id,
            spotify_url: match.external_urls.spotify,
            album_art_url: match.images[0]?.url || null,
          };

          enriched++;
          console.log(`   ✓ Found on Spotify`);
        } else {
          console.log(`   ⚠ Not found on Spotify`);
        }

        // Rate limit friendly delay
        await sleep(100);
      } catch (spotifyError) {
        console.log(`   ⚠ Spotify error: ${spotifyError instanceof Error ? spotifyError.message : 'Unknown'}`);
      }

      // Insert into database
      const { error } = await supabase
        .from('rs_500_albums')
        .upsert({
          rank,
          artist,
          album,
          year,
          already_covered: !!wasCovered,
          ...spotifyData,
        }, { onConflict: 'rank' });

      if (error) {
        throw error;
      }

      imported++;
      if (wasCovered) alreadyCovered++;

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary');
  console.log('='.repeat(60));
  console.log(`Total albums:        ${rows.length}`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Enriched with Spotify: ${enriched}`);
  console.log(`Already covered:       ${alreadyCovered}`);
  console.log(`Errors:                ${errors}`);
  console.log('='.repeat(60));

  if (imported > 0) {
    console.log('\n✅ Import complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check the rs_500_albums table in Supabase');
    console.log('   2. Use the RS 500 picker in the admin dashboard');
  }
}

main().catch(console.error);

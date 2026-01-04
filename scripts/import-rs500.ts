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

/**
 * Calculate similarity score between two strings (0-1, higher is better)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Calculate Levenshtein distance-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  // Simple contains check for partial matches
  if (longer.includes(shorter)) return 0.8;

  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Find the best matching album from Spotify search results
 */
function findBestMatch(
  results: any[],
  targetArtist: string,
  targetAlbum: string,
  targetYear: number
): any | null {
  if (results.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const result of results) {
    // Get the primary artist name
    const spotifyArtist = result.artists[0]?.name || '';
    const spotifyAlbum = result.name;
    const spotifyYear = parseInt(result.release_date.split('-')[0]);

    // Calculate similarity scores
    const artistScore = stringSimilarity(targetArtist, spotifyArtist);
    const albumScore = stringSimilarity(targetAlbum, spotifyAlbum);
    const yearMatch = Math.abs(spotifyYear - targetYear) <= 2 ? 1 : 0;

    // Weighted scoring: artist and album name are most important
    // Artist: 40%, Album: 40%, Year: 20%
    const totalScore = (artistScore * 0.4) + (albumScore * 0.4) + (yearMatch * 0.2);

    // Require minimum thresholds
    const meetsThreshold = artistScore >= 0.6 && albumScore >= 0.6;

    if (meetsThreshold && totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = result;
    }
  }

  return bestMatch;
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
      // Search Spotify for the album with artist and album name
      const searchQuery = `artist:"${artist}" album:"${album}"`;
      let spotifyData = null;

      try {
        const results = await spotifyClient.searchAlbums(searchQuery, 10);

        if (results.length > 0) {
          // Use our matching algorithm to find the best match
          const match = findBestMatch(results, artist, album, year);

          if (match) {
            spotifyData = {
              spotify_id: match.id,
              spotify_url: match.external_urls.spotify,
              album_art_url: match.images[0]?.url || null,
            };

            enriched++;
            console.log(`   ✓ Found on Spotify: "${match.name}" by ${match.artists[0]?.name}`);
          } else {
            console.log(`   ⚠ No good match found on Spotify`);
          }
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

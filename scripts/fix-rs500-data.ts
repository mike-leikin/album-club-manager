// scripts/fix-rs500-data.ts
// Fix the RS 500 data by properly parsing CSV with quoted fields

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

// Proper CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Now import after env is set
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID!;
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  if (!spotifyClientId || !spotifyClientSecret) {
    console.error('❌ Missing Spotify credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 RS 500 Data Fix Tool\n');

  const csvPath = process.argv[2] || '/Users/mikeleikin/Downloads/rolling_stone_list.csv';

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.error('   Please provide path: npm run fix:rs500 /path/to/file.csv');
    process.exit(1);
  }

  // Parse CSV properly
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const header = parseCSVLine(lines[0]);

  console.log(`📋 CSV Headers: ${header.join(', ')}\n`);

  interface CSVRow {
    Ranking: string;
    Artist: string;
    Album: string;
    Year: string;
    Mike?: string;
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    header.forEach((key, index) => {
      row[key.trim()] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  console.log(`✅ Parsed ${rows.length} albums\n`);

  // Spotify token management
  let spotifyToken: string | null = null;
  let tokenExpiry = 0;

  async function getSpotifyToken() {
    if (spotifyToken && Date.now() < tokenExpiry) {
      return spotifyToken;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    spotifyToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;
    return spotifyToken;
  }

  async function searchSpotify(query: string, limit: number = 10) {
    const token = await getSpotifyToken();
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'album');
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();
    return data.albums.items;
  }

  /**
   * Calculate similarity score between two strings (0-1, higher is better)
   */
  function stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;
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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
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
    targetYear: number | null
  ): any | null {
    if (results.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const result of results) {
      const spotifyArtist = result.artists[0]?.name || '';
      const spotifyAlbum = result.name;
      const spotifyYear = parseInt(result.release_date.split('-')[0]);

      const artistScore = stringSimilarity(targetArtist, spotifyArtist);
      const albumScore = stringSimilarity(targetAlbum, spotifyAlbum);
      const yearMatch = targetYear && Math.abs(spotifyYear - targetYear) <= 2 ? 1 : 0.5;

      // Weighted scoring: artist and album name are most important
      const totalScore = (artistScore * 0.4) + (albumScore * 0.4) + (yearMatch * 0.2);

      // Require minimum thresholds for both artist and album name
      const meetsThreshold = artistScore >= 0.6 && albumScore >= 0.6;

      if (meetsThreshold && totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = result;
      }
    }

    return bestMatch;
  }

  let updated = 0;
  let enriched = 0;
  let errors = 0;

  console.log('🔄 Updating database with corrected data...\n');

  for (const row of rows) {
    const rank = parseInt(row.Ranking);

    // Convert "Last, First" to "First Last"
    let artist = row.Artist;
    if (artist.includes(',')) {
      const parts = artist.split(',').map(p => p.trim());
      if (parts.length === 2) {
        artist = `${parts[1]} ${parts[0]}`;
      }
    }

    const album = row.Album;
    const year = parseInt(row.Year) || null;
    const mikeRating = row.Mike;
    const wasCovered = mikeRating && mikeRating.trim() !== '';

    console.log(`[${rank}/${rows.length}] ${album} - ${artist} (${year || 'N/A'})${wasCovered ? ' [COVERED]' : ''}`);

    try {
      // Get existing record
      const { data: existing } = await supabase
        .from('rs_500_albums')
        .select('spotify_id, spotify_url, album_art_url')
        .eq('rank', rank)
        .single();

      let spotifyData: any = {};

      // Only search Spotify if we don't already have data
      if (!existing?.spotify_id) {
        try {
          const searchQuery = `artist:"${artist}" album:"${album}"`;
          const results = await searchSpotify(searchQuery, 10);

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

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (spotifyError) {
          console.log(`   ⚠ Spotify error: ${spotifyError instanceof Error ? spotifyError.message : 'Unknown'}`);
        }
      } else {
        spotifyData = {
          spotify_id: existing.spotify_id,
          spotify_url: existing.spotify_url,
          album_art_url: existing.album_art_url,
        };
        console.log(`   ✓ Using existing Spotify data`);
      }

      // Update with corrected artist name
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

      if (error) throw error;

      updated++;
      console.log(`   ✅ Updated`);
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Update Summary');
  console.log('='.repeat(60));
  console.log(`Total albums:          ${rows.length}`);
  console.log(`Successfully updated:  ${updated}`);
  console.log(`Newly enriched:        ${enriched}`);
  console.log(`Errors:                ${errors}`);
  console.log('='.repeat(60));

  if (updated > 0) {
    console.log('\n✅ Update complete!');
  }

  process.exit(0);
});

// scripts/refetch-all-spotify.ts
// Force re-fetch Spotify data for ALL RS 500 albums using improved matching

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

  console.log('🔄 Re-fetching Spotify data for ALL RS 500 albums\n');

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

  // Get all albums from database
  const { data: albums, error: fetchError } = await supabase
    .from('rs_500_albums')
    .select('*')
    .order('rank');

  if (fetchError) {
    console.error('Error fetching albums:', fetchError);
    process.exit(1);
  }

  if (!albums || albums.length === 0) {
    console.log('No albums found in database');
    process.exit(0);
  }

  console.log(`Found ${albums.length} albums to process\n`);

  let updated = 0;
  let found = 0;
  let notFound = 0;
  let errors = 0;

  for (const album of albums) {
    console.log(`[${album.rank}/${albums.length}] ${album.album} - ${album.artist} (${album.year || 'N/A'})`);

    try {
      // Force re-search on Spotify with improved query
      const searchQuery = `artist:"${album.artist}" album:"${album.album}"`;
      const results = await searchSpotify(searchQuery, 10);

      if (results.length > 0) {
        // Use our matching algorithm to find the best match
        const match = findBestMatch(results, album.artist, album.album, album.year);

        if (match) {
          const spotifyData = {
            spotify_id: match.id,
            spotify_url: match.external_urls.spotify,
            album_art_url: match.images[0]?.url || null,
          };

          // Update the database
          const { error: updateError } = await supabase
            .from('rs_500_albums')
            .update(spotifyData)
            .eq('rank', album.rank);

          if (updateError) throw updateError;

          found++;
          updated++;
          console.log(`   ✓ Updated: "${match.name}" by ${match.artists[0]?.name}`);
        } else {
          notFound++;
          console.log(`   ⚠ No good match found`);
        }
      } else {
        notFound++;
        console.log(`   ⚠ No results from Spotify`);
      }

      // Rate limit friendly delay
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Re-fetch Summary');
  console.log('='.repeat(60));
  console.log(`Total albums:          ${albums.length}`);
  console.log(`Successfully updated:  ${updated}`);
  console.log(`Found on Spotify:      ${found}`);
  console.log(`Not found:             ${notFound}`);
  console.log(`Errors:                ${errors}`);
  console.log('='.repeat(60));

  if (updated > 0) {
    console.log('\n✅ Re-fetch complete!');
  }

  process.exit(0);
});

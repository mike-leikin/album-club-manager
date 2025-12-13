// scripts/import-rs500-simple.ts
// Simplified RS 500 import that loads env first

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
    process.env[key] = value;
  }
});

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

  console.log('🎸 Rolling Stone 500 Import Tool\n');

  const csvPath = process.argv[2] || '/Users/mikeleikin/Downloads/rolling_stone_list.csv';

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // Parse CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const header = lines[0].split(',');

  interface CSVRow {
    Ranking: string;
    Artist: string;
    Album: string;
    Year: string;
    Mike?: string;
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: any = {};
    header.forEach((key, index) => {
      row[key.trim()] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  console.log(`✅ Found ${rows.length} albums\n`);

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

  async function searchSpotify(query: string) {
    const token = await getSpotifyToken();
    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'album');
    url.searchParams.append('limit', '3');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();
    return data.albums.items;
  }

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
    const wasCovered = mikeRating && mikeRating.trim() !== '';

    console.log(`[${rank}/${rows.length}] ${album} - ${artist} (${year})${wasCovered ? ' [COVERED]' : ''}`);

    try {
      let spotifyData: any = {};

      // Search Spotify
      try {
        const searchQuery = `${album} ${artist}`;
        const results = await searchSpotify(searchQuery);

        if (results.length > 0) {
          const match = results.find((r: any) => {
            const spotifyYear = parseInt(r.release_date.split('-')[0]);
            return Math.abs(spotifyYear - year) <= 2;
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

        await new Promise(resolve => setTimeout(resolve, 100));
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

      if (error) throw error;

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
  console.log(`Total albums:          ${rows.length}`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Enriched with Spotify: ${enriched}`);
  console.log(`Already covered:       ${alreadyCovered}`);
  console.log(`Errors:                ${errors}`);
  console.log('='.repeat(60));

  if (imported > 0) {
    console.log('\n✅ Import complete!');
  }
});

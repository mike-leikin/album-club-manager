// Quick script to list albums marked as already_covered
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.local
const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

// Dynamic import after env is set
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Get all albums marked as already_covered
  const { data: albums, error } = await supabase
    .from('rs_500_albums')
    .select('rank, artist, album, year')
    .eq('already_covered', true)
    .order('rank', { ascending: true });

  if (error) {
    console.error('Error fetching albums:', error);
    process.exit(1);
  }

  console.log('\n=== Albums Marked as Already Covered (from CSV) ===\n');

  if (!albums || albums.length === 0) {
    console.log('No albums marked as already_covered.');
  } else {
    albums.forEach(album => {
      console.log(`#${album.rank}: ${album.album} - ${album.artist} (${album.year || 'N/A'})`);
    });

    console.log(`\nTotal: ${albums.length} albums already covered\n`);
  }

  process.exit(0);
});

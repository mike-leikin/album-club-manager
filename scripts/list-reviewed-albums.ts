// Quick script to list all reviewed classic albums
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

  // Get all weeks with classic albums
  const { data: weeks, error } = await supabase
    .from('weeks')
    .select('week_number, classic_title, classic_artist, rs_rank')
    .not('classic_title', 'is', null)
    .order('week_number', { ascending: true });

  if (error) {
    console.error('Error fetching weeks:', error);
    process.exit(1);
  }

  console.log('\n=== Classic Albums Reviewed in Album Club ===\n');

  if (!weeks || weeks.length === 0) {
    console.log('No classic albums found in weeks table.');
  } else {
    weeks.forEach(week => {
      console.log(`Week ${week.week_number}: ${week.classic_title} - ${week.classic_artist}${week.rs_rank ? ` (RS #${week.rs_rank})` : ''}`);
    });

    console.log(`\nTotal: ${weeks.length} classic albums reviewed\n`);
  }

  process.exit(0);
});

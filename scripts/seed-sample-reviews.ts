#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function seedSampleReviews() {
  console.log('🌱 Seeding sample review data...\n');

  try {
    // First, get or create some test participants
    const testParticipants = [
      { name: 'Alice Johnson', email: 'alice@example.com' },
      { name: 'Bob Smith', email: 'bob@example.com' },
      { name: 'Carol Davis', email: 'carol@example.com' },
    ];

    console.log('📝 Creating test participants...');
    const participantIds: string[] = [];

    for (const p of testParticipants) {
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('email', p.email)
        .single();

      if (existing) {
        console.log(`   ✓ Participant "${p.name}" already exists`);
        participantIds.push(existing.id);
      } else {
        const { data: newParticipant, error } = await supabase
          .from('participants')
          .insert(p)
          .select()
          .single();

        if (error) {
          console.error(`   ✗ Failed to create "${p.name}":`, error.message);
        } else {
          console.log(`   ✓ Created participant "${p.name}"`);
          participantIds.push(newParticipant.id);
        }
      }
    }

    if (participantIds.length === 0) {
      console.error('\n❌ No participants available. Exiting.');
      process.exit(1);
    }

    console.log(`\n📊 Adding sample reviews for Week 1...\n`);

    // Sample reviews for week 1
    const sampleReviews = [
      {
        week_number: 1,
        participant_id: participantIds[0],
        album_type: 'contemporary',
        rating: 8.5,
        favorite_track: 'Track One',
        review_text: 'Really enjoyed this one! Great production and catchy melodies.',
      },
      {
        week_number: 1,
        participant_id: participantIds[0],
        album_type: 'classic',
        rating: 9.2,
        favorite_track: 'The Classic Track',
        review_text: 'A timeless masterpiece. Still sounds fresh today.',
      },
      {
        week_number: 1,
        participant_id: participantIds[1],
        album_type: 'contemporary',
        rating: 7.0,
        favorite_track: 'Another Great Song',
        review_text: 'Solid album, but a bit repetitive in places.',
      },
      {
        week_number: 1,
        participant_id: participantIds[2],
        album_type: 'classic',
        rating: 8.8,
        favorite_track: 'Legendary Song',
        review_text: 'Incredible vocals and storytelling.',
      },
    ];

    // Delete existing reviews for week 1 (to avoid duplicates on re-run)
    await supabase.from('reviews').delete().eq('week_number', 1);

    // Insert new reviews
    const { data: insertedReviews, error: insertError } = await supabase
      .from('reviews')
      .insert(sampleReviews)
      .select();

    if (insertError) {
      console.error('❌ Failed to insert reviews:', insertError.message);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${insertedReviews?.length || 0} sample reviews for Week 1`);
    console.log('\n📈 Summary:');
    console.log(`   Contemporary reviews: ${sampleReviews.filter(r => r.album_type === 'contemporary').length}`);
    console.log(`   Classic reviews: ${sampleReviews.filter(r => r.album_type === 'classic').length}`);
    console.log('\n✨ Done! Visit /admin and set week number to 2 or higher to see results in the email preview.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedSampleReviews();

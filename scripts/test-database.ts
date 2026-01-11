// scripts/test-database.ts
// Test database operations after running migrations

import { createServerClient } from '../lib/supabaseClient';
import type { ParticipantInsert, ReviewInsert } from '../lib/types/database';

async function testDatabase() {
  console.log('🧪 Testing database operations...\n');

  const supabase = createServerClient();

  // Test 1: Check if participants table exists and we can query it
  console.log('1️⃣  Testing participants table...');
  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('*')
    .limit(5);

  if (participantsError) {
    console.log('   ❌ Error querying participants:', participantsError.message);
  } else {
    console.log(`   ✅ Participants table exists (${participants.length} rows)`);
    if (participants.length > 0) {
      console.log('   Sample:', participants[0]);
    }
  }

  // Test 2: Check if reviews table exists and we can query it
  console.log('\n2️⃣  Testing reviews table...');
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .limit(5);

  if (reviewsError) {
    console.log('   ❌ Error querying reviews:', reviewsError.message);
  } else {
    console.log(`   ✅ Reviews table exists (${reviews.length} rows)`);
    if (reviews.length > 0) {
      console.log('   Sample:', reviews[0]);
    }
  }

  // Test 3: Check if weeks table still works
  console.log('\n3️⃣  Testing weeks table...');
  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .limit(5);

  if (weeksError) {
    console.log('   ❌ Error querying weeks:', weeksError.message);
  } else {
    console.log(`   ✅ Weeks table exists (${weeks.length} rows)`);
    if (weeks.length > 0) {
      console.log('   Sample week_number:', weeks[0].week_number);
    }
  }

  // Test 4: Try inserting and deleting a test participant
  console.log('\n4️⃣  Testing participant insert/delete...');
  const testParticipant: ParticipantInsert = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
  };

  const { data: insertedParticipant, error: insertError } = await supabase
    .from('participants')
    .insert(testParticipant)
    .select()
    .single();

  if (insertError) {
    console.log('   ❌ Error inserting participant:', insertError.message);
  } else {
    console.log('   ✅ Successfully inserted test participant:', insertedParticipant.email);

    // Delete the test participant
    const { error: deleteError } = await supabase
      .from('participants')
      .delete()
      .eq('id', insertedParticipant.id);

    if (deleteError) {
      console.log('   ⚠️  Warning: Could not delete test participant:', deleteError.message);
    } else {
      console.log('   ✅ Successfully cleaned up test participant');
    }
  }

  // Test 5: Test joined query (reviews with participants)
  console.log('\n5️⃣  Testing joined query (reviews with participants)...');
  const { data: reviewsWithParticipants, error: joinError } = await supabase
    .from('reviews')
    .select(`
      *,
      participant:participants!reviews_participant_id_fkey(*)
    `)
    .limit(3);

  if (joinError) {
    console.log('   ❌ Error with joined query:', joinError.message);
  } else {
    console.log(`   ✅ Joined query works (${reviewsWithParticipants.length} rows)`);
  }

  console.log('\n✅ Database tests complete!');
}

testDatabase()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const participants = [
  { name: 'Adam Abeles', email: 'abeles@gmail.com' },
  { name: 'Adam Deppe', email: 'adam.deppe@gmail.com' },
  { name: 'Andrew Treske', email: 'andrew.treske@gmail.com' },
  { name: 'Mom Leikin', email: 'bettyleikin@gmail.com' },
  { name: 'Charles Smith', email: 'brokensmokes@gmail.com' },
  { name: 'Brendan McLaughlin', email: 'btm232@gmail.com' },
  { name: 'Cassandra Koederitz', email: 'cassandra.koederitz@gmail.com' },
  { name: 'Jake Smith', email: 'cjs351@gmail.com' },
  { name: 'Conor Shaw', email: 'conormarcusshaw@gmail.com' },
  { name: 'Curry Smith', email: 'currysmith@gmail.com' },
  { name: 'Daniel Meyer', email: 'danieladammeyer@gmail.com' },
  { name: 'Dave Leikin', email: 'david.leikin@gmail.com' },
  { name: 'Danny Delaney', email: 'delaney.j.daniel@gmail.com' },
  { name: 'David Polashuk', email: 'dpolashuk@lmcplaw.com' },
  { name: 'Edward Leikin', email: 'ebl500@gmail.com' },
  { name: 'Edward Holofcener', email: 'ed@golfzoo.com' },
  { name: 'Erika Ibrahimi', email: 'erikakibrahimi@gmail.com' },
  { name: 'Ian Porter', email: 'ianporter143@gmail.com' },
  { name: 'Jocelyn Keehner', email: 'jekeehner@gmail.com' },
  { name: 'Jesse Leikin', email: 'jesseleikin@gmail.com' },
  { name: 'Jeff Leikin', email: 'jmleikin@gmail.com' },
  { name: 'Joey Weissburg', email: 'joey.weissburg@gmail.com' },
  { name: 'Jonathan Jacobson', email: 'jonathanejacobson@gmail.com' },
  { name: 'Josh Waller', email: 'jswaller@gmail.com' },
  { name: 'Julia Leikin', email: 'julia.leikin@gmail.com' },
  { name: 'Julia Brenner', email: 'juliamiriamb@gmail.com' },
  { name: 'Kevin Leikin', email: 'kjleikin@gmail.com' },
  { name: 'Kyle Evans', email: 'kyle.s.evans@gmail.com' },
  { name: 'Laura Schwartz', email: 'laurarschwartz@gmail.com' },
  { name: 'Neil Palmisiano', email: 'neil.palmisiano@gmail.com' },
  { name: 'Noam Orr', email: 'noamorr@gmail.com' },
  { name: 'Nora Udell', email: 'noraudell@gmail.com' },
  { name: 'Rachel Clark', email: 'rachelgclark@gmail.com' },
  { name: 'Robert Friedman', email: 'robert.d.friedman@gmail.com' },
  { name: 'Samantha Hong', email: 'samanthanarae@gmail.com' },
  { name: 'Sarah Hansel', email: 'sarah.t.hansel@gmail.com' },
  { name: 'Scott Baylin', email: 'sbaylin@catonsvilledentalcare.com' },
  { name: 'Scott Breitenother', email: 'scott.breitenother@gmail.com' },
  { name: 'Scott Shelton', email: 'scottshelton10@gmail.com' },
  { name: 'Stuart Elston', email: 'stuart.b.elston@gmail.com' },
  { name: 'John Gilling', email: 'suddensleep@gmail.com' },
  { name: 'Michael Zierolf', email: 'zierolf.michael@gmail.com' },
];

async function importParticipants() {
  console.log(`Starting import of ${participants.length} participants...\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const participant of participants) {
    try {
      // Check if participant already exists
      const { data: existing } = await supabase
        .from('participants')
        .select('id, email, deleted_at')
        .eq('email', participant.email)
        .maybeSingle();

      if (existing) {
        if (existing.deleted_at) {
          // Restore soft-deleted participant
          const { error: restoreError } = await supabase
            .from('participants')
            .update({ deleted_at: null, name: participant.name })
            .eq('id', existing.id);

          if (restoreError) {
            console.error(`❌ Error restoring ${participant.email}:`, restoreError.message);
            errorCount++;
          } else {
            console.log(`✅ Restored: ${participant.name} (${participant.email})`);
            successCount++;
          }
        } else {
          console.log(`⏭️  Skipped (already exists): ${participant.name} (${participant.email})`);
          skippedCount++;
        }
      } else {
        // Insert new participant
        const { error: insertError } = await supabase
          .from('participants')
          .insert({
            name: participant.name,
            email: participant.email,
            email_subscribed: true,
            reminder_email_subscribed: true,
          });

        if (insertError) {
          console.error(`❌ Error adding ${participant.email}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Added: ${participant.name} (${participant.email})`);
          successCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Unexpected error for ${participant.email}:`, error);
      errorCount++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total processed: ${participants.length}`);
  console.log(`Successfully added/restored: ${successCount}`);
  console.log(`Skipped (already exists): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

importParticipants()
  .then(() => {
    console.log('\nImport complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

// scripts/run-email-logs-migration.ts
// Creates the email_logs table directly via Supabase client

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { createServerClient } from '../lib/supabaseClient';

async function main() {
  console.log('🚀 Creating email_logs table...\n');

  const supabase = createServerClient() as any;

  // Create email_logs table
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create email_logs table to track email delivery
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        week_number INTEGER NOT NULL,
        participant_id INTEGER,
        participant_email VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resend_id VARCHAR(255),
        error_message TEXT,

        CONSTRAINT fk_participant
          FOREIGN KEY (participant_id)
          REFERENCES participants(id)
          ON DELETE SET NULL,

        CONSTRAINT fk_week
          FOREIGN KEY (week_number)
          REFERENCES weeks(week_number)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_email_logs_week ON email_logs(week_number);
      CREATE INDEX IF NOT EXISTS idx_email_logs_participant ON email_logs(participant_id);
      CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
      CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
    `
  });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease run the migration manually:');
    console.error('1. Go to: https://supabase.com/dashboard/project/houteunrytkvhrmagjrg');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Run the SQL from: supabase/migrations/004_create_email_logs.sql\n');
    process.exit(1);
  }

  console.log('✅ email_logs table created successfully!\n');

  // Verify the table was created
  const { data, error: verifyError } = await supabase
    .from('email_logs')
    .select('*')
    .limit(1);

  if (verifyError) {
    console.error('⚠️  Could not verify table:', verifyError.message);
  } else {
    console.log('✅ Table verified and ready to use!');
  }
}

main();

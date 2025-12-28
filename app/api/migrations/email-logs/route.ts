import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function POST() {
  try {
    const supabase = createServerClient() as any;

    console.log('🚀 Creating email_logs table...\n');

    // Create email_logs table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
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
      return NextResponse.json(
        {
          error: error.message,
          note: 'The Supabase JS client cannot execute DDL. Please run the migration manually in the Supabase SQL Editor.',
          migrationFile: 'supabase/migrations/004_create_email_logs.sql'
        },
        { status: 500 }
      );
    }

    console.log('✅ email_logs table created successfully!\n');

    // Verify the table was created
    const { error: verifyError } = await supabase
      .from('email_logs')
      .select('*')
      .limit(1);

    if (verifyError) {
      return NextResponse.json(
        {
          success: true,
          warning: 'Table created but verification failed: ' + verifyError.message
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'email_logs table created and verified successfully!'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}

-- Create email_logs table to track email delivery
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,
  participant_id UUID, -- Changed to UUID to match participants table
  participant_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'sent', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resend_id VARCHAR(255), -- Resend API message ID
  error_message TEXT,

  -- Foreign key to participants (nullable in case participant is deleted)
  CONSTRAINT fk_participant
    FOREIGN KEY (participant_id)
    REFERENCES participants(id)
    ON DELETE SET NULL,

  -- Foreign key to weeks (to track which week the email was for)
  CONSTRAINT fk_week
    FOREIGN KEY (week_number)
    REFERENCES weeks(week_number)
    ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX idx_email_logs_week ON email_logs(week_number);
CREATE INDEX idx_email_logs_participant ON email_logs(participant_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- Add comments for documentation
COMMENT ON TABLE email_logs IS 'Tracks all email sending attempts for audit trail and retry functionality';
COMMENT ON COLUMN email_logs.status IS 'Email delivery status: sent (successfully sent), failed (delivery failed)';
COMMENT ON COLUMN email_logs.resend_id IS 'Message ID returned by Resend API for tracking';
COMMENT ON COLUMN email_logs.participant_email IS 'Email address used (stored for history even if participant is deleted)';

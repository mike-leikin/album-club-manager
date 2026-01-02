-- Migration: Add email preferences to participants table
-- This allows users to unsubscribe from weekly emails while remaining active

-- Add email subscription field (default to true for existing users)
ALTER TABLE participants
  ADD COLUMN email_subscribed BOOLEAN DEFAULT true;

-- Add unsubscribe token for secure unsubscribe links
ALTER TABLE participants
  ADD COLUMN unsubscribe_token UUID DEFAULT gen_random_uuid();

-- Create index for token lookups
CREATE INDEX idx_participants_unsubscribe_token
  ON participants(unsubscribe_token);

-- Add comments for documentation
COMMENT ON COLUMN participants.email_subscribed IS 'Whether user wants to receive weekly album emails. Users can unsubscribe but still participate.';
COMMENT ON COLUMN participants.unsubscribe_token IS 'Unique token for secure unsubscribe links in emails.';

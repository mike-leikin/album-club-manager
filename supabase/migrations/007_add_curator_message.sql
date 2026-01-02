-- Migration: Add curator_message field to weeks table
-- This allows curators to add a custom message to weekly emails

-- Add custom message field to weeks table
ALTER TABLE weeks
  ADD COLUMN curator_message TEXT;

-- Add comment for documentation
COMMENT ON COLUMN weeks.curator_message IS 'Optional custom message from curator to include in weekly emails';

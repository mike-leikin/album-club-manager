-- Migration: Add soft delete support to participants table
-- Created: 2025-12-27
-- Description: Adds deleted_at column and modifies foreign key constraints to preserve review history

-- ============================================================================
-- ADD SOFT DELETE COLUMN TO PARTICIPANTS
-- ============================================================================

-- Add deleted_at column (null means not deleted, timestamp means soft deleted)
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for filtering active participants efficiently
CREATE INDEX IF NOT EXISTS idx_participants_deleted_at ON public.participants(deleted_at)
WHERE deleted_at IS NULL;

-- ============================================================================
-- MODIFY REVIEWS FOREIGN KEY TO PREVENT CASCADE DELETE
-- ============================================================================

-- Drop the existing CASCADE constraint on reviews
ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_participant_id_fkey;

-- Add new constraint with SET NULL behavior to preserve reviews
-- When participant is hard-deleted, participant_id becomes null but review is preserved
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_participant_id_fkey
  FOREIGN KEY (participant_id)
  REFERENCES public.participants(id)
  ON DELETE SET NULL;

-- ============================================================================
-- UPDATE EMAIL LOGS CONSTRAINT (already has SET NULL, but ensure it's correct)
-- ============================================================================

-- The email_logs table already has ON DELETE SET NULL, but let's ensure consistency
-- This is a safety check in case it was created differently
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS fk_participant;

  -- Re-add with correct behavior
  ALTER TABLE public.email_logs
  ADD CONSTRAINT fk_participant
    FOREIGN KEY (participant_id)
    REFERENCES public.participants(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN undefined_table THEN
    -- email_logs table doesn't exist yet, skip
    NULL;
END $$;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.participants.deleted_at IS 'Soft delete timestamp. NULL means active, timestamp means deleted. Deleted participants can be restored within 30 days.';

-- ============================================================================
-- CREATE VIEW FOR ACTIVE PARTICIPANTS
-- ============================================================================

-- Create a view that filters out deleted participants for easier querying
CREATE OR REPLACE VIEW public.active_participants AS
SELECT * FROM public.participants
WHERE deleted_at IS NULL
ORDER BY name;

COMMENT ON VIEW public.active_participants IS 'View of participants that have not been soft-deleted';

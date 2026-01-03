-- Migration: Add review moderation system
-- Created: 2026-01-03
-- Description: Adds approval workflow and moderation capabilities to reviews

-- Add moderation columns to reviews table
ALTER TABLE public.reviews
ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending', 'approved', 'hidden')),
ADD COLUMN moderated_at TIMESTAMPTZ,
ADD COLUMN moderated_by UUID REFERENCES public.participants(id),
ADD COLUMN moderation_notes TEXT;

-- Add indexes for filtering by moderation status (critical for performance)
CREATE INDEX idx_reviews_moderation_status ON public.reviews(moderation_status);
CREATE INDEX idx_reviews_week_status ON public.reviews(week_number, moderation_status);
CREATE INDEX idx_reviews_moderated_by ON public.reviews(moderated_by);

-- Add comments for documentation
COMMENT ON COLUMN public.reviews.moderation_status IS 'Review status: pending (awaiting approval), approved (visible to public), hidden (curator hidden)';
COMMENT ON COLUMN public.reviews.moderated_at IS 'Timestamp when review was last moderated';
COMMENT ON COLUMN public.reviews.moderated_by IS 'Participant ID of curator who moderated';
COMMENT ON COLUMN public.reviews.moderation_notes IS 'Internal curator notes about moderation decision (not visible to participants)';

-- Backfill existing reviews as approved (grandfathered in)
UPDATE public.reviews
SET moderation_status = 'approved'
WHERE moderation_status = 'pending';

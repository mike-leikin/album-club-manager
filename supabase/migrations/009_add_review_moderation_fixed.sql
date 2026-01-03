-- Migration: Add review moderation system (idempotent version)
-- Created: 2026-01-03
-- Description: Adds approval workflow and moderation capabilities to reviews

-- Add moderation_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'reviews'
                   AND column_name = 'moderation_status') THEN
        ALTER TABLE public.reviews
        ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (moderation_status IN ('pending', 'approved', 'hidden'));

        COMMENT ON COLUMN public.reviews.moderation_status IS 'Review status: pending (awaiting approval), approved (visible to public), hidden (curator hidden)';
    END IF;
END $$;

-- Add moderated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'reviews'
                   AND column_name = 'moderated_at') THEN
        ALTER TABLE public.reviews ADD COLUMN moderated_at TIMESTAMPTZ;

        COMMENT ON COLUMN public.reviews.moderated_at IS 'Timestamp when review was last moderated';
    END IF;
END $$;

-- Add moderated_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'reviews'
                   AND column_name = 'moderated_by') THEN
        ALTER TABLE public.reviews ADD COLUMN moderated_by UUID REFERENCES public.participants(id);

        COMMENT ON COLUMN public.reviews.moderated_by IS 'Participant ID of curator who moderated';
    END IF;
END $$;

-- Add moderation_notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'reviews'
                   AND column_name = 'moderation_notes') THEN
        ALTER TABLE public.reviews ADD COLUMN moderation_notes TEXT;

        COMMENT ON COLUMN public.reviews.moderation_notes IS 'Internal curator notes about moderation decision (not visible to participants)';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_week_status ON public.reviews(week_number, moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_moderated_by ON public.reviews(moderated_by);

-- Backfill existing reviews as approved (grandfathered in)
-- Only update rows that are currently 'pending' to avoid overwriting any manual moderation
UPDATE public.reviews
SET moderation_status = 'approved'
WHERE moderation_status = 'pending';

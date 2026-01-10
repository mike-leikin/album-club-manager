-- Migration: Increase review_text length limit to 2000 characters
-- Description: Raises review_text constraint from 500 to 2000 characters

-- Drop existing constraint (unnamed constraints default to reviews_review_text_check)
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_review_text_check;

-- Add updated constraint with explicit name
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_review_text_check
  CHECK (char_length(review_text) <= 2000);

-- Update comment to reflect new limit
COMMENT ON COLUMN public.reviews.review_text IS 'Free text review (max 2000 characters)';

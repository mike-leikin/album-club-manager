-- Migration: Increase review_text length limit to 3000 characters
-- Description: Raises review_text constraint from 2000 to 3000 characters

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_review_text_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_review_text_check
  CHECK (char_length(review_text) <= 3000);

COMMENT ON COLUMN public.reviews.review_text IS 'Free text review (max 3000 characters)';

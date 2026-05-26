-- Migration: Make rating column nullable in reviews table
-- Created: 2026-05-26
-- Description: Allow reviews to be submitted without a numerical rating (N/A)

ALTER TABLE public.reviews ALTER COLUMN rating DROP NOT NULL;

COMMENT ON COLUMN public.reviews.rating IS 'Rating from 0.0 to 10.0 (Pitchfork-style), null means no rating was given';

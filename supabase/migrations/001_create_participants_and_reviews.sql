-- Migration: Create participants and reviews tables
-- Created: 2025-11-29
-- Description: Sets up the core tables for participant management and album reviews

-- ============================================================================
-- PARTICIPANTS TABLE
-- ============================================================================
-- Stores information about album club participants
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_participants_email ON public.participants(email);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================
-- Stores participant reviews for albums in each week
-- Reviews are optional - participants can submit 0, 1, or 2 reviews per week
-- No constraints enforce participation (typically ~10% submit each week)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  album_type TEXT NOT NULL CHECK (album_type IN ('contemporary', 'classic')),
  rating DECIMAL(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  favorite_track TEXT,
  review_text TEXT CHECK (char_length(review_text) <= 500),
  album_recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_week_number ON public.reviews(week_number);
CREATE INDEX IF NOT EXISTS idx_reviews_participant_id ON public.reviews(participant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_week_participant ON public.reviews(week_number, participant_id);

-- Add updated_at trigger
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on both tables
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies for participants table
-- Allow public read access (needed for review form participant selection)
CREATE POLICY "Allow public read access to participants"
  ON public.participants
  FOR SELECT
  USING (true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Allow service role full access to participants"
  ON public.participants
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policies for reviews table
-- Allow public read access (needed to display results)
CREATE POLICY "Allow public read access to reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Allow anyone to insert reviews (for review submission)
CREATE POLICY "Allow public insert of reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own reviews (could add email-based auth later)
CREATE POLICY "Allow public update of reviews"
  ON public.reviews
  FOR UPDATE
  USING (true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Allow service role full access to reviews"
  ON public.reviews
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.participants IS 'Album club participants who submit reviews';
COMMENT ON COLUMN public.participants.name IS 'Full name of the participant';
COMMENT ON COLUMN public.participants.email IS 'Email address (unique identifier)';

COMMENT ON TABLE public.reviews IS 'Album reviews submitted by participants for each week';
COMMENT ON COLUMN public.reviews.week_number IS 'References the week number from the weeks table';
COMMENT ON COLUMN public.reviews.album_type IS 'Either contemporary or classic';
COMMENT ON COLUMN public.reviews.rating IS 'Rating from 0.0 to 10.0 (Pitchfork-style)';
COMMENT ON COLUMN public.reviews.favorite_track IS 'Participants favorite track from the album';
COMMENT ON COLUMN public.reviews.review_text IS 'Free text review (max 500 characters)';
COMMENT ON COLUMN public.reviews.album_recommendation IS 'Optional album recommendation for next week';

-- Migration: Add authentication support
-- Description: Links participants table to Supabase auth.users and adds curator permissions

-- ============================================================================
-- STEP 1: Add auth_user_id to participants table
-- ============================================================================
-- This links public.participants to auth.users
ALTER TABLE public.participants
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint to ensure one participant per auth user
CREATE UNIQUE INDEX idx_participants_auth_user_id ON public.participants(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Add curator permission flag
ALTER TABLE public.participants
ADD COLUMN is_curator BOOLEAN NOT NULL DEFAULT false;

-- Add index for curator lookups
CREATE INDEX idx_participants_is_curator ON public.participants(is_curator) WHERE is_curator = true;

-- ============================================================================
-- STEP 2: Update RLS Policies for participants table
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow public read access to participants" ON public.participants;
DROP POLICY IF EXISTS "Allow service role full access to participants" ON public.participants;

-- Allow all authenticated and anon users to read participants (needed for review form)
CREATE POLICY "Allow read access to participants"
  ON public.participants
  FOR SELECT
  USING (true);

-- Allow authenticated users to read their own participant record
CREATE POLICY "Allow users to read own participant data"
  ON public.participants
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Allow authenticated users to update their own participant record (name only, not curator status)
CREATE POLICY "Allow users to update own participant data"
  ON public.participants
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id AND
    -- Prevent users from elevating their curator status
    (SELECT is_curator FROM public.participants WHERE auth_user_id = auth.uid()) = is_curator
  );

-- Allow curators to manage all participants
CREATE POLICY "Allow curators to manage participants"
  ON public.participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

-- Allow service role full access (for admin operations)
CREATE POLICY "Allow service role full access to participants"
  ON public.participants
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 3: Update RLS Policies for weeks table
-- ============================================================================

-- Enable RLS on weeks table if not already enabled
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to weeks" ON public.weeks;
DROP POLICY IF EXISTS "Allow curators to manage weeks" ON public.weeks;
DROP POLICY IF EXISTS "Allow service role full access to weeks" ON public.weeks;

-- Allow everyone to read weeks (needed for review form)
CREATE POLICY "Allow read access to weeks"
  ON public.weeks
  FOR SELECT
  USING (true);

-- Allow curators to manage weeks
CREATE POLICY "Allow curators to manage weeks"
  ON public.weeks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

-- Allow service role full access
CREATE POLICY "Allow service role full access to weeks"
  ON public.weeks
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 4: Update RLS Policies for reviews table
-- ============================================================================

DROP POLICY IF EXISTS "Allow public read access to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert of reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public update of reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow service role full access to reviews" ON public.reviews;

-- Allow everyone to read reviews (public stats)
CREATE POLICY "Allow read access to reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Allow authenticated and anonymous users to insert reviews
-- (Anonymous can submit if they have a participant email match)
CREATE POLICY "Allow review submission"
  ON public.reviews
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own reviews
CREATE POLICY "Allow users to update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (
    participant_id IN (
      SELECT id FROM public.participants
      WHERE auth_user_id = auth.uid()
    )
  );

-- Allow curators to manage all reviews
CREATE POLICY "Allow curators to manage reviews"
  ON public.reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

-- Allow service role full access
CREATE POLICY "Allow service role full access to reviews"
  ON public.reviews
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 5: Update RLS Policies for other tables
-- ============================================================================

-- RS500 Albums
ALTER TABLE public.rs_500_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to rs_500_albums" ON public.rs_500_albums;
DROP POLICY IF EXISTS "Allow curators to manage rs_500_albums" ON public.rs_500_albums;
DROP POLICY IF EXISTS "Allow service role full access to rs_500_albums" ON public.rs_500_albums;

CREATE POLICY "Allow read access to rs_500_albums"
  ON public.rs_500_albums
  FOR SELECT
  USING (true);

CREATE POLICY "Allow curators to manage rs_500_albums"
  ON public.rs_500_albums
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow service role full access to rs_500_albums"
  ON public.rs_500_albums
  FOR ALL
  USING (auth.role() = 'service_role');

-- Email Logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow curators to read email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow curators to manage email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow service role full access to email_logs" ON public.email_logs;

CREATE POLICY "Allow curators to read email_logs"
  ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow curators to manage email_logs"
  ON public.email_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow service role full access to email_logs"
  ON public.email_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 6: Create helper function to check if user is curator
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_curator(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.participants
    WHERE auth_user_id = user_id AND is_curator = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Create trigger to auto-create participant record on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_participant_id UUID;
BEGIN
  -- Try to find existing participant by email
  SELECT id INTO existing_participant_id
  FROM public.participants
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_participant_id IS NOT NULL THEN
    -- Link existing participant to new auth user
    UPDATE public.participants
    SET auth_user_id = NEW.id
    WHERE id = existing_participant_id;
  ELSE
    -- Create new participant record
    INSERT INTO public.participants (auth_user_id, email, name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN public.participants.auth_user_id IS 'Links to auth.users table for authentication';
COMMENT ON COLUMN public.participants.is_curator IS 'True if user has curator/admin permissions';
COMMENT ON FUNCTION public.is_curator IS 'Helper function to check if a user is a curator';
COMMENT ON FUNCTION public.handle_new_user IS 'Auto-creates or links participant record when user signs up';

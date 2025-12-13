-- Migration: Create Rolling Stone 500 albums table
-- Created: 2024-12-12
-- Description: Stores the Rolling Stone 500 Greatest Albums list with usage tracking

-- ============================================================================
-- CREATE RS 500 ALBUMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rs_500_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INTEGER NOT NULL UNIQUE,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  year INTEGER,
  already_covered BOOLEAN DEFAULT false,
  spotify_id TEXT,
  spotify_url TEXT,
  album_art_url TEXT,
  times_used INTEGER DEFAULT 0,
  last_used_week INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rs500_rank ON public.rs_500_albums(rank);
CREATE INDEX IF NOT EXISTS idx_rs500_artist ON public.rs_500_albums(artist);
CREATE INDEX IF NOT EXISTS idx_rs500_album ON public.rs_500_albums(album);
CREATE INDEX IF NOT EXISTS idx_rs500_already_covered ON public.rs_500_albums(already_covered);
CREATE INDEX IF NOT EXISTS idx_rs500_times_used ON public.rs_500_albums(times_used);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_rs500_albums_updated_at
  BEFORE UPDATE ON public.rs_500_albums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.rs_500_albums ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for album picker)
CREATE POLICY "Allow public read access to rs_500_albums"
  ON public.rs_500_albums
  FOR SELECT
  USING (true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Allow service role full access to rs_500_albums"
  ON public.rs_500_albums
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.rs_500_albums IS 'Rolling Stone 500 Greatest Albums of All Time';
COMMENT ON COLUMN public.rs_500_albums.rank IS 'Album ranking (1-500)';
COMMENT ON COLUMN public.rs_500_albums.artist IS 'Artist name from RS 500 list';
COMMENT ON COLUMN public.rs_500_albums.album IS 'Album title from RS 500 list';
COMMENT ON COLUMN public.rs_500_albums.year IS 'Release year';
COMMENT ON COLUMN public.rs_500_albums.already_covered IS 'Whether this album was already covered by Mike before the club started';
COMMENT ON COLUMN public.rs_500_albums.spotify_id IS 'Spotify album ID';
COMMENT ON COLUMN public.rs_500_albums.spotify_url IS 'Spotify album URL';
COMMENT ON COLUMN public.rs_500_albums.album_art_url IS 'Spotify album artwork URL';
COMMENT ON COLUMN public.rs_500_albums.times_used IS 'Number of times used in album club';
COMMENT ON COLUMN public.rs_500_albums.last_used_week IS 'Week number when last used';

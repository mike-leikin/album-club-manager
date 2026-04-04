-- Migration: Create playlists table
-- Description: Store Spotify playlists generated from weekly favorite tracks

CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL REFERENCES public.weeks(week_number) ON DELETE CASCADE,
  spotify_playlist_id TEXT NOT NULL,
  spotify_playlist_url TEXT NOT NULL,
  track_count INTEGER NOT NULL DEFAULT 0,
  tracks_not_found TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_week_number ON public.playlists(week_number);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON public.playlists(created_at DESC);

COMMENT ON TABLE public.playlists IS 'Spotify playlists generated from weekly favorite tracks';
COMMENT ON COLUMN public.playlists.tracks_not_found IS 'Track names that could not be matched on Spotify';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow curators to manage playlists" ON public.playlists;
DROP POLICY IF EXISTS "Allow service role full access to playlists" ON public.playlists;

CREATE POLICY "Allow curators to manage playlists"
  ON public.playlists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE auth_user_id = auth.uid() AND is_curator = true
    )
  );

CREATE POLICY "Allow service role full access to playlists"
  ON public.playlists
  FOR ALL
  USING (auth.role() = 'service_role');
